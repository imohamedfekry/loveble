import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { AccessTokenService } from 'src/common/Global/security/jwt/services/access-token.service';

import { PREVIEW_PUBLIC_PREFIX } from './preview.constants';
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
 * Register the raw Fastify preview-proxy routes.
 *
 * These live outside Nest's routing/interceptor pipeline so the sandbox
 * response can be streamed back byte-for-byte instead of being wrapped in the
 * standard `ApiResponse` envelope. Auth is enforced here directly:
 *   - owner session cookie (`Authorization` JWT), or
 *   - a short-lived internal `x-preview-token` (server-to-server / AI).
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

  const handler = async (req: FastifyRequest, reply: FastifyReply) => {
    const rawId = (req.params as { projectId?: string }).projectId ?? '';
    if (!/^\d+$/.test(rawId)) {
      return reply.code(404).send({ message: 'Not found' });
    }

    const { preview } = services();

    if (!(await authorize(req, rawId))) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    let state: PreviewState | undefined;
    try {
      state = await preview.ensure(BigInt(rawId));
    } catch {
      state = preview.peek(BigInt(rawId));
    }

    if (!state?.host || !state.url) {
      return reply
        .code(503)
        .send({ message: state?.error ?? 'Preview is starting' });
    }

    // The app is served at the sandbox root, so strip our public prefix before
    // forwarding and re-add it to absolute URLs in the response.
    const prefix = `${PREVIEW_PUBLIC_PREFIX}/${rawId}`;
    const target = `https://${state.host}${stripPrefix(req.url, prefix)}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      const lower = key.toLowerCase();
      if (STRIP_REQUEST_HEADERS.has(lower) || value === undefined) continue;
      if (Array.isArray(value)) headers.set(lower, value.join(', '));
      else headers.set(lower, String(value));
    }

    const method = req.method.toUpperCase();
    let body: BodyInit | undefined;
    if (method !== 'GET' && method !== 'HEAD' && req.body != null) {
      if (Buffer.isBuffer(req.body)) body = new Uint8Array(req.body);
      else if (typeof req.body === 'string') body = req.body;
      else body = JSON.stringify(req.body);
    }

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
    reply.code(upstream.status);
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (STRIP_RESPONSE_HEADERS.has(lower)) return;
      if (lower === 'location') {
        reply.header('location', rewriteLocation(value, prefix));
        return;
      }
      reply.header(key, value);
    });

    if (!upstream.body) return reply.send();

    // Text responses (HTML/JS/CSS) are buffered so absolute asset URLs can be
    // pointed back through the proxy; everything else is streamed untouched.
    if (isRewritable(contentType)) {
      const text = await upstream.text();
      return reply.send(rewriteBody(text, contentType, prefix));
    }

    return reply.send(
      Readable.fromWeb(upstream.body as unknown as WebReadableStream),
    );
  };

  const methods: Array<
    'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'
  > = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

  fastify.route({
    method: methods,
    url: `${PREVIEW_PUBLIC_PREFIX}/:projectId`,
    handler,
  });
  fastify.route({
    method: methods,
    url: `${PREVIEW_PUBLIC_PREFIX}/:projectId/*`,
    handler,
  });

  async function authorize(
    req: FastifyRequest,
    rawId: string,
  ): Promise<boolean> {
    const { tokens, accessTokens, projects } = services();

    const internalHeader = req.headers['x-preview-token'];
    const internal = Array.isArray(internalHeader)
      ? internalHeader[0]
      : internalHeader;
    if (internal && tokens.verify(rawId, internal)) return true;

    const cookie = (
      req as FastifyRequest & { cookies?: Record<string, string> }
    ).cookies?.['Authorization'];
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
