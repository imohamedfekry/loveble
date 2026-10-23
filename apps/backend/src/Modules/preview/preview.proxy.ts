import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { AccessTokenService } from 'src/common/Global/security/jwt/services/access-token.service';

import {
  PREVIEW_PUBLIC_PREFIX,
  previewProjectFromHost,
  previewPublicScheme,
} from './preview.constants';
import { isRewritable, prefixUrl, rewriteBody } from './preview-rewrite';
import { PreviewService } from './preview.service';
import type { PreviewState } from './preview.service';
import { PreviewTokenService } from './preview-token.service';

const logger = new Logger('PreviewProxy');

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
  });

  const pathHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    const rawId = (req.params as { projectId?: string }).projectId ?? '';
    if (!/^\d+$/.test(rawId)) {
      return reply.code(404).send({ message: 'Not found' });
    }

    if (!(await authorizePath(req, rawId))) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const state = await ensureState(rawId);
    const sandboxHost = state?.host;
    if (!state?.url || !sandboxHost) {
      return reply
        .code(503)
        .send({ message: state?.error ?? 'Preview is starting' });
    }

    const prefix = `${PREVIEW_PUBLIC_PREFIX}/${rawId}`;
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
    // Authenticate before provisioning: an unknown caller must not be able to
    // trigger an install/start cycle for an arbitrary project id. The shared
    // auth cookie is scoped to .loveble.app, so it is sent to the
    // project's preview subdomain as well.
    if (!(await authorizeHost(req, rawId))) {
      return reply
        .code(401)
        .type('text/plain')
        .send('Preview link expired. Reload the preview from the project.');
    }

    // Ignore old links that still carry the removed preview token.
    if (stripPreviewToken(req.url) !== req.url) {
      return reply.redirect(stripPreviewToken(req.url), 302);
    }

    const state = await ensureState(rawId);
    const sandboxHost = state?.host;

    if (!state?.url || !sandboxHost) {
      return reply
        .code(503)
        .send({ message: state?.error ?? 'Preview is starting' });
    }

    return forward(
      req,
      reply,
      rawId,
      sandboxHost,
      null,
      state.trafficToken,
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

  async function authorizeHost(
    req: FastifyRequest,
    rawId: string,
  ): Promise<boolean> {
    const { accessTokens, projects } = services();

    // `req.cookies` is populated by the cookie plugin during normal routing,
    // but this hook can run before that; fall back to the raw header.
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
  ): Promise<FastifyReply> {
    const targetPath = prefix ? stripPrefix(req.url, prefix) : req.url;
    const target = `https://${sandboxHost}${targetPath}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      const lower = key.toLowerCase();
      if (STRIP_REQUEST_HEADERS.has(lower) || value === undefined) continue;
      if (Array.isArray(value)) headers.set(lower, value.join(', '));
      else headers.set(lower, String(value));
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
      if (STRIP_RESPONSE_HEADERS.has(lower)) return;
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

    if (!upstream.body) return reply.send();

    // Only the path-based proxy needs to rewrite root-absolute asset URLs:
    // the sandbox thinks it is served from the root, and the subdomain proxy
    // makes that true. Host-mode responses are streamed untouched.
    if (prefix && isRewritable(contentType)) {
      const text = await upstream.text();
      return reply.send(rewriteBody(text, contentType, prefix));
    }

    return reply.send(
      Readable.fromWeb(upstream.body as unknown as WebReadableStream),
    );
  }
}

/** Read a request body without relying on Fastify's parser (onRequest hook). */
async function readRequestBody(
  req: FastifyRequest,
  method: string,
): Promise<BodyInit | undefined> {
  if (method === 'GET' || method === 'HEAD') return undefined;

  if (req.body != null) {
    if (Buffer.isBuffer(req.body)) return new Uint8Array(req.body);
    if (typeof req.body === 'string') return req.body;
    return JSON.stringify(req.body);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req.raw as AsyncIterable<Buffer | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return undefined;
  return new Uint8Array(Buffer.concat(chunks));
}

/** Read a single cookie value from a raw `Cookie` header. */
function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;

    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return undefined;
}

/** Remove the one-time preview token from a URL. */
function stripPreviewToken(url: string): string {
  const queryStart = url.indexOf('?');
  if (queryStart < 0) return url;

  const params = new URLSearchParams(url.slice(queryStart + 1));
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
