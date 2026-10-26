import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import * as https from 'node:https';
import type { IncomingMessage, Server } from 'node:http';
import type { Socket } from 'node:net';
import type { Duplex } from 'node:stream';

import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { AccessTokenService } from 'src/common/Global/security/jwt/services/access-token.service';

import { authorizePreviewCaller } from './preview-auth';
import { previewProjectFromHost } from './preview.constants';
import { PreviewService } from './preview.service';
import { PreviewTokenService } from './preview-token.service';

const logger = new Logger('PreviewWebSocket');

/** Hop-by-hop / auth headers we replace rather than copy to E2B. */
const STRIP_UPGRADE_HEADERS = new Set([
  'host',
  'cookie',
  'authorization',
  'x-preview-token',
  'e2b-traffic-access-token',
  'content-length',
  'accept-encoding',
]);

/**
 * Proxy Vite HMR (and any other) WebSocket upgrades on `<id>.loveble.app` to
 * the sandbox traffic URL. Socket.IO on `api.loveble.app` is left untouched:
 * we only intercept hosts that look like a preview subdomain, and re-emit
 * everything else to the listeners that were already on the HTTP server
 * (registered after `listen`, once Socket.IO has attached).
 */
export function registerPreviewWebSocketProxy(
  server: Server,
  app: NestFastifyApplication,
): void {
  const services = () => ({
    preview: app.get(PreviewService),
    accessTokens: app.get(AccessTokenService),
    projects: app.get(ProjectRepository),
    tokens: app.get(PreviewTokenService),
  });

  type UpgradeListener = (
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ) => void;

  const others = server.listeners('upgrade').slice() as UpgradeListener[];
  server.removeAllListeners('upgrade');

  const dispatch: UpgradeListener = (req, socket, head) => {
    const hostHeader = headerValue(req.headers.host);
    const projectId = previewProjectFromHost(hostHeader);
    if (!projectId) {
      for (const listener of others) {
        listener.call(server, req, socket, head);
      }
      return;
    }

    socket.pause();
    void tunnelPreviewUpgrade(req, socket, head, projectId, services()).catch(
      (err: unknown) => {
        logger.warn(
          `preview websocket failed for ${projectId}: ${String(err)}`,
        );
        rejectUpgrade(socket, 502, 'Preview upstream unreachable');
      },
    );
  };

  // Socket.IO may attach after listen() (or after a timed-out listen). Keep
  // those upgrade handlers in `others` so they never see preview hosts.
  const originalOn = server.on.bind(server);
  const capture = ((
    event: string | symbol,
    listener: (...args: unknown[]) => void,
  ) => {
    if (event === 'upgrade') {
      others.push(listener as UpgradeListener);
      return server;
    }
    return originalOn(event, listener);
  }) as Server['on'];
  server.on = capture;
  server.addListener = capture;

  const originalPrepend = server.prependListener.bind(server);
  server.prependListener = ((
    event: string | symbol,
    listener: (...args: unknown[]) => void,
  ) => {
    if (event === 'upgrade') {
      others.unshift(listener as UpgradeListener);
      return server;
    }
    return originalPrepend(event, listener);
  }) as Server['prependListener'];

  originalOn('upgrade', dispatch);
}

async function tunnelPreviewUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  projectId: string,
  deps: {
    preview: PreviewService;
    accessTokens: AccessTokenService;
    projects: ProjectRepository;
    tokens: PreviewTokenService;
  },
): Promise<void> {
  const authorized = await authorizePreviewCaller({
    cookieHeader: req.headers.cookie,
    projectId,
    tokens: deps.tokens,
    accessTokens: deps.accessTokens,
    projects: deps.projects,
  });

  let state;
  if (authorized) {
    try {
      state = await deps.preview.ensure(BigInt(projectId));
    } catch {
      state = deps.preview.peek(BigInt(projectId));
    }
  } else {
    state = await deps.preview.resolveRunning(BigInt(projectId));
  }

  const sandboxHost = state?.host;
  if (!state?.url || !sandboxHost) {
    rejectUpgrade(
      socket,
      authorized ? 503 : 401,
      authorized ? 'Preview is starting' : 'Unauthorized',
    );
    return;
  }

  await pipeUpgrade(req, socket, head, sandboxHost, state.trafficToken);
}

function pipeUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  sandboxHost: string,
  trafficToken?: string,
): Promise<void> {
  const { hostname, port } = splitHostPort(sandboxHost);
  const headers: Record<string, string | string[] | number> = {};

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined || STRIP_UPGRADE_HEADERS.has(key.toLowerCase())) {
      continue;
    }
    headers[key] = value;
  }

  headers.host = hostname;
  headers.connection = 'Upgrade';
  headers.upgrade = 'websocket';
  if (trafficToken) {
    headers['e2b-traffic-access-token'] = trafficToken;
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve();
    };

    const upstream = https.request({
      hostname,
      port,
      path: req.url ?? '/',
      method: 'GET',
      headers,
    });

    const fail = (err?: Error) => {
      upstream.destroy();
      rejectUpgrade(socket, 502, 'Preview upstream unreachable');
      finish(err ?? new Error('preview websocket upstream failed'));
    };

    upstream.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      disableTimeout(socket);
      disableTimeout(proxySocket);
      socket.resume();

      const lines = ['HTTP/1.1 101 Switching Protocols'];
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value === undefined) continue;
        const serialized = Array.isArray(value) ? value.join(', ') : value;
        lines.push(`${key}: ${serialized}`);
      }
      socket.write(`${lines.join('\r\n')}\r\n\r\n`);

      if (head.length > 0) proxySocket.write(head);
      if (proxyHead.length > 0) socket.write(proxyHead);

      proxySocket.pipe(socket);
      socket.pipe(proxySocket);

      const close = () => {
        socket.destroy();
        proxySocket.destroy();
      };
      socket.on('error', close);
      proxySocket.on('error', close);
      finish();
    });

    upstream.on('response', (res) => {
      logger.warn(
        `preview websocket upstream returned HTTP ${res.statusCode} instead of 101`,
      );
      res.resume();
      fail();
    });

    upstream.on('error', (err) => fail(err));
    socket.on('error', () => {
      upstream.destroy();
      finish();
    });

    upstream.end();
  });
}

function disableTimeout(socket: Duplex): void {
  if (typeof (socket as Socket).setTimeout === 'function') {
    (socket as Socket).setTimeout(0);
  }
}

function rejectUpgrade(
  socket: Duplex,
  status: number,
  reason: string,
): void {
  if (socket.destroyed) return;
  socket.resume();
  socket.write(
    `HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`,
  );
  socket.destroy();
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function splitHostPort(host: string): { hostname: string; port: number } {
  const idx = host.lastIndexOf(':');
  if (idx > 0 && /^\d+$/.test(host.slice(idx + 1))) {
    return {
      hostname: host.slice(0, idx),
      port: Number(host.slice(idx + 1)),
    };
  }
  return { hostname: host, port: 443 };
}

