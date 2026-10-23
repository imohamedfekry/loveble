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

  async handleDisconnect(socket: Socket) {
    await this.terminalService.stop(socket.id).catch(() => undefined);
    this.connectionHandler.handleDisconnect(socket);
  }

  @SubscribeMessage('terminal:start')
  async start(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    payload: { projectId?: unknown; cols?: unknown; rows?: unknown },
  ) {
    const data = socketData(socket);
    await data.authReady;

    const userId = data.userId ?? data.user?.id?.toString();
    if (!userId) {
      socket.emit('terminal:error', { message: 'Unauthorized' });
      return;
    }

    const projectId =
      typeof payload?.projectId === 'string' ? payload.projectId : '';
    if (!/^\d+$/.test(projectId)) {
      socket.emit('terminal:error', { message: 'Invalid project id' });
      return;
    }

    let project: Awaited<ReturnType<ProjectRepository['findById']>>;
    try {
      project = await this.projectRepository.findById(projectId);
    } catch {
      socket.emit('terminal:error', { message: 'Project not found' });
      return;
    }
    if (!project || project.userId.toString() !== userId) {
      this.logger.warn(
        `Unauthorized terminal attempt socket=${socket.id} project=${projectId} user=${userId}`,
      );
      socket.emit('terminal:error', { message: 'Unauthorized for project' });
      return;
    }

    const cols = clamp(payload?.cols, MIN_COLS, MAX_COLS, 80);
    const rows = clamp(payload?.rows, MIN_ROWS, MAX_ROWS, 24);

    try {
      const result = await this.terminalService.start({
        key: socket.id,
        projectId: BigInt(projectId),
        cols,
        rows,
        userName: data.user?.username,
        projectLabel: projectId,
        onData: (data) => socket.emit('terminal:data', data),
        onExit: (exitCode) => socket.emit('terminal:exit', { exitCode }),
      });

      if (!socket.connected) {
        await this.terminalService.stop(socket.id);
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
      socket.emit('terminal:error', { message });
    }
  }

  @SubscribeMessage('terminal:input')
  handleInput(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { data?: unknown },
  ) {
    if (!socketData(socket).user) return;
    if (typeof payload?.data !== 'string') return;
    this.terminalService.write(socket.id, payload.data);
  }

  @SubscribeMessage('terminal:resize')
  async handleResize(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { cols?: unknown; rows?: unknown },
  ) {
    if (!socketData(socket).user) return;
    const cols = clamp(payload?.cols, MIN_COLS, MAX_COLS, 80);
    const rows = clamp(payload?.rows, MIN_ROWS, MAX_ROWS, 24);
    await this.terminalService.resize(socket.id, cols, rows);
  }

  @SubscribeMessage('terminal:stop')
  async stop(@ConnectedSocket() socket: Socket) {
    await this.terminalService.stop(socket.id);
    socket.emit('terminal:stopped');
  }
}
