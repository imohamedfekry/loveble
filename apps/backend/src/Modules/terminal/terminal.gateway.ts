import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { ConnectionHandler } from 'src/Modules/realtime/core/connection.handler';
import { TerminalService } from './terminal.service';

const MIN_COLS = 20;
const MAX_COLS = 400;
const MIN_ROWS = 4;
const MAX_ROWS = 200;

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === 'number' ? Math.floor(value) : fallback;
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function corsOrigins(): string[] {
  return process.env.WS_CORS_ORIGINS
    ? process.env.WS_CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : [
        'https://loveble.app',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:4200',
      ];
}

interface TerminalSocketData {
  authReady?: Promise<void>;
  user?: { id: bigint | number | string; username?: string };
  userId?: string;
  /** Stable terminal session key (user + project), set by terminal:start. */
  terminalKey?: string;
}

function socketData(socket: Socket): TerminalSocketData {
  return socket.data as TerminalSocketData;
}

/**
 * Interactive terminal for the project workspace. Each socket owns one PTY in
 * the project's sandbox; input/output are relayed as text frames.
 */
@WebSocketGateway({
  namespace: '/terminal',
  cors: { origin: corsOrigins(), credentials: true },
})
export class TerminalGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TerminalGateway.name);

  constructor(
    private readonly connectionHandler: ConnectionHandler,
    private readonly projectRepository: ProjectRepository,
    private readonly terminalService: TerminalService,
  ) {}

  handleConnection(socket: Socket) {
    socketData(socket).authReady = this.connectionHandler.handleConnect(socket);
  }

  handleDisconnect(socket: Socket) {
    // Keep the session resumable instead of killing it: the client's next
    // socket (reconnect or dock re-open) picks it right back up within TTL.
    const sessionKey = socketData(socket).terminalKey;
    if (sessionKey) this.terminalService.detach(sessionKey);
    this.connectionHandler.handleDisconnect(socket);
  }

  @SubscribeMessage('terminal:start')
  async start(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    payload: {
      projectId?: unknown;
      cols?: unknown;
      rows?: unknown;
      fresh?: unknown;
    },
  ) {
    const data = socketData(socket);
    await data.authReady;

    const emitError = (message: string, code: 'fatal' | 'retryable') =>
      socket.emit('terminal:error', { message, code });

    const userId = data.userId ?? data.user?.id?.toString();
    if (!userId) {
      emitError('Unauthorized', 'fatal');
      return;
    }

    const projectId =
      typeof payload?.projectId === 'string' ? payload.projectId : '';
    if (!/^\d+$/.test(projectId)) {
      emitError('Invalid project id', 'fatal');
      return;
    }

    let project: Awaited<ReturnType<ProjectRepository['findById']>>;
    try {
      project = await this.projectRepository.findById(projectId);
    } catch {
      emitError('Project not found', 'fatal');
      return;
    }
    if (!project || project.userId.toString() !== userId) {
      this.logger.warn(
        `Unauthorized terminal attempt socket=${socket.id} project=${projectId} user=${userId}`,
      );
      emitError('Unauthorized for project', 'fatal');
      return;
    }

    // The session key is stable per user + project so a reconnect (new socket
    // id) resumes the same terminal instead of building a new one.
    const key = `terminal:${userId}:${projectId}`;
    socketData(socket).terminalKey = key;

    const cols = clamp(payload?.cols, MIN_COLS, MAX_COLS, 80);
    const rows = clamp(payload?.rows, MIN_ROWS, MAX_ROWS, 24);

    try {
      const result = await this.terminalService.start({
        key,
        projectId: BigInt(projectId),
        cols,
        rows,
        fresh: payload?.fresh === true,
        userName: data.user?.username,
        projectLabel: projectId,
        onData: (chunk) => socket.emit('terminal:data', chunk),
        onExit: (exitCode) => socket.emit('terminal:exit', { exitCode }),
      });

      if (!socket.connected) {
        // The socket died mid-prepare; keep the session resumable briefly in
        // case socket.io reconnects right after.
        this.terminalService.detach(key);
        return;
      }

      socket.emit('terminal:ready', {
        ...result,
        userName: data.user?.username ?? null,
        projectId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Terminal failed socket=${socket.id} project=${projectId}: ${message}`,
      );
      emitError(message, 'retryable');
    }
  }

  @SubscribeMessage('terminal:input')
  handleInput(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { data?: unknown },
  ) {
    if (!socketData(socket).user) return;
    if (typeof payload?.data !== 'string') return;
    this.terminalService.write(
      socketData(socket).terminalKey ?? '',
      payload.data,
    );
  }

  @SubscribeMessage('terminal:resize')
  handleResize(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { cols?: unknown; rows?: unknown },
  ) {
    if (!socketData(socket).user) return;
    const cols = clamp(payload?.cols, MIN_COLS, MAX_COLS, 80);
    const rows = clamp(payload?.rows, MIN_ROWS, MAX_ROWS, 24);
    this.terminalService.resize(
      socketData(socket).terminalKey ?? '',
      cols,
      rows,
    );
  }

  @SubscribeMessage('terminal:stop')
  async stop(@ConnectedSocket() socket: Socket) {
    const key = socketData(socket).terminalKey;
    if (key) await this.terminalService.stop(key);
    socket.emit('terminal:stopped');
  }
}
