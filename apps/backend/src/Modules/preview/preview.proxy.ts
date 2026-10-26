import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { AccessTokenService } from 'src/common/Global/security/jwt/services/access-token.service';

import {
  authorizePreviewCaller,
  issuePreviewAuthCookie,
  readCookie,
} from './preview-auth';
import {
  PREVIEW_PUBLIC_PREFIX,
  previewProjectFromHost,
  previewPublicScheme,
} from './preview.constants';
import { isRewritable, prefixUrl, rewriteBody } from './preview-rewrite';
import {
  PREVIEW_REPORTER_PATH,
  injectReporterHtml,
  injectReporterStream,
  previewReporterSnippet,
} from './preview-reporter';
import { PreviewLogService } from './preview-logs.service';
import { PreviewService } from './preview.service';
import type { PreviewState } from './preview.service';
import { PreviewTokenService } from './preview-token.service';

const logger = new Logger('PreviewProxy');

const HTML_CONTENT = /text\/html/i;
/** Hard cap for browser-console payloads posted by the preview reporter. */
const MAX_REPORTER_BODY_BYTES = 64 * 1024;

/** Incoming headers we must not forward to the sandbox. */
const STRIP_REQUEST_HEADERS = new Set([
  'host',
  'cookie',
  'authorization',
  'x-preview-token',
  'e2b-traffic-access-token',
  'connection',
  'content-length',
  'accept-encoding',
  // Vite keys off Origin / X-Forwarded-Host; leaving the public preview host
  // here makes `*.css?url` resolve as raw CSS instead of a JS module.
  'origin',
  'referer',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-for',
  'x-forwarded-port',
  'x-real-ip',
]);

/** Response headers we let the runtime regenerate. */
const STRIP_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]);

interface ProxyServices {
  preview: PreviewService;
  tokens: PreviewTokenService;
  accessTokens: AccessTokenService;
  projects: ProjectRepository;
  logs: PreviewLogService;
}

/**
 * Register the raw Fastify preview-proxy handlers.
 *
 * Public previews are served from `<projectId>.loveble.app` (nginx routes the
 * whole wildcard host here) and proxied to the sandbox root, so the app sees
 * normal root-relative URLs and needs no response rewriting.
 *
 * The legacy path-based routes (`/api/v1/preview/:projectId`) stay available
 * for internal/server-to-server callers.
 *
 * Both live outside Nest's routing/interceptor pipeline so the sandbox
 * response can be streamed back byte-for-byte instead of being wrapped in the
 * standard `ApiResponse` envelope.
 */
export function registerPreviewProxy(
  fastify: FastifyInstance,
  app: NestFastifyApplication,
): void {
  let cache: ProxyServices | undefined;
  const services = (): ProxyServices => {
    if (!cache) {
      cache = {
        preview: app.get<PreviewService>(PreviewService),
        tokens: app.get<PreviewTokenService>(PreviewTokenService),
        accessTokens: app.get<AccessTokenService>(AccessTokenService),
        projects: app.get<ProjectRepository>(ProjectRepository),
        logs: app.get<PreviewLogService>(PreviewLogService),
      };
    }
    return cache;
  };

  // Host-based previews. Registered as an onRequest hook because the project
  // id lives in the Host header, not in the path (and Fastify has no per-host
  // routing). Hooks run for unmatched (404) routes too.
  fastify.addHook('onRequest', async (req, reply) => {
    const projectId = previewProjectFromHost(req.hostname);
    if (!projectId) return;
    await handleHostPreview(req, reply, projectId);
    return reply;
  });

  const pathHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    const rawId = (req.params as { projectId?: string }).projectId ?? '';
    if (!/^\d+$/.test(rawId)) {
      return reply.code(404).send({ message: 'Not found' });
    }

    if (!(await authorizePath(req, rawId))) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const prefix = `${PREVIEW_PUBLIC_PREFIX}/${rawId}`;
    if (isReporterRequest(req, prefix)) {
      return recordBrowserEvents(req, reply, rawId);
    }

    const state = await ensureState(rawId);
    const sandboxHost = state?.host;
    if (!state?.url || !sandboxHost) {
      return reply
        .code(503)
        .send({ message: state?.error ?? 'Preview is starting' });
    }

    return forward(req, reply, rawId, sandboxHost, prefix, state.trafficToken);
  };

  const methods: Array<
    'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'
  > = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

  fastify.route({
    method: methods,
    url: `${PREVIEW_PUBLIC_PREFIX}/:projectId`,
    handler: pathHandler,
  });
  fastify.route({
    method: methods,
    url: `${PREVIEW_PUBLIC_PREFIX}/:projectId/*`,
    handler: pathHandler,
  });

  // ------------------------------------------------------------- host mode ---

  async function handleHostPreview(
    req: FastifyRequest,
    reply: FastifyReply,
    rawId: string,
  ): Promise<FastifyReply | undefined> {
    // Starting a sandbox still requires the owner. Once the preview is
    // already running, proxy without a Loveble session — Google/GitHub OAuth
    // returns are top-level GET navigations from another site, so neither
    // Authorization nor a pin cookie is sent.
  
  const authorized = await authorizeHost(req, rawId);
  // console.log('[preview.proxy] authorizeHost && projectId:', rawId, 'authorized:', authorized);

    // Ignore old links that still carry the removed preview token.
    if (stripPreviewToken(req.url) !== req.url) {
      return reply.redirect(stripPreviewToken(req.url), 302);
    }

    // Browser console events from the injected reporter: no need to wake the
    // preview server, they only feed the terminal panel.
    if (isReporterRequest(req, null)) {
      if (
        !authorized &&
        !(await services().preview.resolveRunning(BigInt(rawId)))?.url
      ) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }
      return recordBrowserEvents(req, reply, rawId);
    }

    const state = authorized
      ? await ensureState(rawId)
      : await services().preview.resolveRunning(BigInt(rawId));
    const sandboxHost = state?.host;

    if (!state?.url || !sandboxHost) {
    // console.log('[preview.proxy] no url or host for project', rawId, 'state:', state, 'host:', sandboxHost);
      if (!authorized) {
        return reply
          .code(401)
          .type('text/plain')
          .send('Preview link expired. Reload the preview from the project.');
      }
      return reply
        .code(503)
        .send({ message: state?.error ?? 'Preview is starting' });
    }

    const pinCookie = issuePreviewAuthCookie(services().tokens, rawId);
    reply.header('set-cookie', pinCookie);

    return forward(
      req,
      reply,
      rawId,
      sandboxHost,
      null,
      state.trafficToken,
      pinCookie,
    );
  }

  // --------------------------------------------------------------- helpers ---

  async function ensureState(rawId: string): Promise<PreviewState | undefined> {
    const { preview } = services();
    try {
      return await preview.ensure(BigInt(rawId));
    } catch {
      return preview.peek(BigInt(rawId));
    }
  }

  async function recordBrowserEvents(
    req: FastifyRequest,
    reply: FastifyReply,
    rawId: string,
  ): Promise<FastifyReply> {
    const { logs } = services();
    const payload = await readJsonBody(req);
    const events =
      payload && typeof payload === 'object'
        ? (payload as { events?: unknown }).events
        : undefined;

    if (!Array.isArray(events)) {
      return reply.code(400).send({ message: 'Invalid payload' });
    }

    logs.pushBrowserEvents(BigInt(rawId), events);
    return reply.code(204).send();
  }

  async function authorizeHost(
    req: FastifyRequest,
    rawId: string,
  ): Promise<boolean> {
    const { accessTokens, projects, tokens } = services();
    return authorizePreviewCaller({
      cookieHeader: req.headers.cookie,
      parsedCookies: req.cookies,
      projectId: rawId,
      tokens,
      accessTokens,
      projects,
    });
  }

  async function authorizePath(
    req: FastifyRequest,
    rawId: string,
  ): Promise<boolean> {
    const { tokens, accessTokens, projects } = services();

    const internalHeader = req.headers['x-preview-token'];
    const internal = Array.isArray(internalHeader)
      ? internalHeader[0]
      : internalHeader;
    if (internal && tokens.verify(rawId, internal)) return true;

    const cookie =
      req.cookies?.['Authorization'] ??
      readCookie(req.headers.cookie, 'Authorization');
    if (!cookie) return false;

    try {
      const payload = await accessTokens.verify<{ sub: string }>(cookie.trim());
      if (!payload?.sub) return false;
      const project = await projects.findById(BigInt(rawId));
      return Boolean(project && project.userId === BigInt(payload.sub));
    } catch {
      return false;
    }
  }

  async function forward(
    req: FastifyRequest,
    reply: FastifyReply,
    rawId: string,
    sandboxHost: string,
    prefix: string | null,
    trafficToken?: string,
    pinCookie?: string,
  ): Promise<FastifyReply> {
    const incomingPath = req.raw.url ?? req.url;
    const targetPath = prefix ? stripPrefix(incomingPath, prefix) : incomingPath;
    const sandboxOrigin = `https://${sandboxHost}`;
    const target = `${sandboxOrigin}${targetPath}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      const lower = key.toLowerCase();
      if (STRIP_REQUEST_HEADERS.has(lower) || value === undefined) continue;
      if (Array.isArray(value)) headers.set(lower, value.join(', '));
      else headers.set(lower, String(value));
    }

    headers.set('origin', sandboxOrigin);
    headers.set('referer', `${sandboxOrigin}${targetPath}`);

    // Vite serves raw CSS when Accept is text/css. Module imports of
    // `styles.css?url` (and script dest in general) must get JS.
    const dest = (headers.get('sec-fetch-dest') ?? '').toLowerCase();
    if (dest === 'script' || isViteModuleQuery(targetPath)) {
      headers.set('accept', '*/*');
    }

    if (trafficToken) {
      headers.set('e2b-traffic-access-token', trafficToken);
    }

    const method = req.method.toUpperCase();
    const body = await readRequestBody(req, method);

    let upstream: Response;
    try {
      upstream = await fetch(target, {
        method,
        headers,
        body,
        redirect: 'manual',
      });
    } catch (err) {
      logger.warn(`preview upstream failed for ${rawId}: ${String(err)}`);
      return reply.code(502).send({ message: 'Preview upstream unreachable' });
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    const origin = `${previewPublicScheme()}://${req.headers.host ?? req.hostname}`;

    reply.code(upstream.status);
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (STRIP_RESPONSE_HEADERS.has(lower) || lower === 'set-cookie') return;
      if (lower === 'location') {
        reply.header(
          'location',
          prefix
            ? rewriteLocation(value, prefix)
            : rewriteHostLocation(value, sandboxHost, origin),
        );
        return;
      }
      reply.header(key, value);
    });
    if (contentType) reply.type(contentType);

    const setCookies = [
      ...(pinCookie ? [pinCookie] : []),
      ...upstreamSetCookies(upstream.headers),
    ];
    if (setCookies.length === 1) {
      reply.header('set-cookie', setCookies[0]);
    } else if (setCookies.length > 1) {
      reply.header('set-cookie', setCookies);
    }

    if (!upstream.body) return reply.send();

    const isHtml = HTML_CONTENT.test(contentType);
    const injectable = isHtml && method !== 'HEAD';

    // Only the path-based proxy needs to rewrite root-absolute asset URLs:
    // the sandbox thinks it is served from the root, and the subdomain proxy
    // makes that true. Host-mode responses are streamed untouched.
    if (prefix && isRewritable(contentType)) {
      const text = await upstream.text();
      const rewritten = rewriteBody(text, contentType, prefix);
      return reply.send(
        injectable
          ? injectReporterHtml(
              rewritten,
              previewReporterSnippet(`${prefix}${PREVIEW_REPORTER_PATH}`),
            )
          : rewritten,
      );
    }

    // Give the document the console reporter so browser errors reach the
    // terminal panel. Done in the stream, so SSR streaming is preserved.
    if (injectable) {
      return reply.send(
        Readable.fromWeb(
          injectReporterStream(
            upstream.body,
            previewReporterSnippet(PREVIEW_REPORTER_PATH),
          ),
        ),
      );
    }

    return reply.send(
      Readable.fromWeb(upstream.body as unknown as WebReadableStream),
    );
  }
}

function upstreamSetCookies(headers: Headers): string[] {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

/** Vite queries whose response must be a JS module, not the raw asset. */
function isViteModuleQuery(pathAndQuery: string): boolean {
  const query = pathAndQuery.split('?')[1];
  if (!query) return false;
  return /(?:^|&)(?:url|direct|inline|raw|import)(?:=|&|$)/.test(query);
}

/** Read a request body without relying on Fastify's parser (onRequest hook). */
async function readRequestBody(
  req: FastifyRequest,
  method: string,
  limit?: number,
): Promise<BodyInit | undefined> {
  if (method === 'GET' || method === 'HEAD') return undefined;

  if (req.body != null) {
    if (Buffer.isBuffer(req.body)) {
      if (limit && req.body.byteLength > limit) return undefined;
      return new Uint8Array(req.body);
    }
    if (typeof req.body === 'string') {
      if (limit && Buffer.byteLength(req.body) > limit) return undefined;
      return req.body;
    }
    return JSON.stringify(req.body);
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req.raw as AsyncIterable<Buffer | string>) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (limit && size > limit) return undefined;
    chunks.push(buffer);
  }
  if (chunks.length === 0) return undefined;
  return new Uint8Array(Buffer.concat(chunks));
}

/** Whether this request is the preview reporter posting browser console data. */
function isReporterRequest(
  req: FastifyRequest,
  prefix: string | null,
): boolean {
  if (req.method.toUpperCase() !== 'POST') return false;
  const pathOnly = req.url.split('?')[0];
  const path = prefix ? stripPrefix(pathOnly, prefix) : pathOnly;
  return path === PREVIEW_REPORTER_PATH;
}

/** Parse a bounded JSON body posted by the injected reporter. */
async function readJsonBody(req: FastifyRequest): Promise<unknown> {
  const body = await readRequestBody(
    req,
    req.method.toUpperCase(),
    MAX_REPORTER_BODY_BYTES,
  );
  if (!body) return undefined;

  const text =
    typeof body === 'string'
      ? body
      : new TextDecoder().decode(body as Uint8Array);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** Remove the one-time preview token from a URL. */
function stripPreviewToken(url: string): string {
  const queryStart = url.indexOf('?');
  if (queryStart < 0) return url;

  const rawQuery = url.slice(queryStart + 1);
  const params = new URLSearchParams(rawQuery);
  if (!params.has('__preview_token')) return url;

  params.delete('__preview_token');
  const query = params.toString();
  const path = url.slice(0, queryStart);
  return query ? `${path}?${query}` : path;
}

/** Remove the public preview prefix so the sandbox sees a root-relative path. */
function stripPrefix(url: string, prefix: string): string {
  if (url === prefix) return '/';
  if (url.startsWith(`${prefix}/`)) return url.slice(prefix.length);
  if (url.startsWith(`${prefix}?`)) return `/${url.slice(prefix.length)}`;
  return url;
}

/** Keep redirects on the proxy host and inside the public prefix. */
function rewriteLocation(location: string, prefix: string): string {
  let path: string;
  try {
    const url = new URL(location);
    path = `${url.pathname}${url.search}`;
  } catch {
    path = location;
  }
  return prefixUrl(path, prefix);
}

/** Keep sandbox redirects on the preview host (leave external redirects). */
function rewriteHostLocation(
  location: string,
  sandboxHost: string,
  origin: string,
): string {
  try {
    const url = new URL(location);
    if (url.host.toLowerCase() !== sandboxHost.toLowerCase()) return location;
    return `${origin}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return location;
  }
}
