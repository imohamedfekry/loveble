import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { ConnectionHandler } from './connection.handler';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { CollaborationService } from './collaboration.service';
import type { AwarenessSelection } from './awareness.service';
import { COLLAB_EVENTS } from '../events/files.events';

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly connectionHandler: ConnectionHandler,
    private readonly projectRepository: ProjectRepository,
    private readonly fileRepository: FileRepository,
    private readonly collabService: CollaborationService,
  ) {}

  handleConnection(socket: Socket) {
    return this.connectionHandler.handleConnect(socket);
  }

  async handleDisconnect(socket: Socket) {
    const left = await this.collabService.leaveSocket(socket.id);
    for (const viewer of left) {
      this.broadcastPresenceLeave(viewer);
    }
    for (const viewer of left) {
      await this.broadcastAwarenessLeave(viewer.fileId, socket.id);
    }
    return this.connectionHandler.handleDisconnect(socket);
  }

  @SubscribeMessage('project:subscribe')
  async subscribeToProject(
    @ConnectedSocket() socket: Socket,
    @MessageBody() projectId: string,
  ) {
    if (!projectId || typeof projectId !== 'string') {
      socket.emit('project:error', { message: 'Invalid projectId' });
      return;
    }

    let project: Awaited<ReturnType<ProjectRepository['findById']>>;
    try {
      project = await this.projectRepository.findById(projectId);
    } catch {
      socket.emit('project:error', { message: 'Invalid projectId format' });
      return;
    }

    if (!project) {
      socket.emit('project:error', { message: 'Project not found' });
      return;
    }

    const userId = socket.data?.user?.id?.toString() ?? socket.data?.userId;
    if (!userId || project.userId.toString() !== userId.toString()) {
      this.logger.warn(`Unauthorized project subscribe attempt socket=${socket.id} project=${projectId} user=${userId}`);
      socket.emit('project:error', { message: 'Unauthorized' });
      return;
    }

    await socket.join(`project:${projectId}`);
    this.logger.log(`user ${userId} Connected To Project ${projectId}`);

    socket.emit('project:subscribed', { projectId });
    socket.emit(COLLAB_EVENTS.PRESENCE_STATE, {
      projectId,
      viewers: await this.collabService.listProjectViewers(projectId),
    });
  }

  @SubscribeMessage('project:unsubscribe')
  async unsubscribeFromProject(
    @ConnectedSocket() socket: Socket,
    @MessageBody() projectId: string,
  ) {
    if (!projectId || typeof projectId !== 'string') return;
    await socket.leave(`project:${projectId}`);
    socket.emit('project:unsubscribed', { projectId });
  }

  @SubscribeMessage(COLLAB_EVENTS.JOIN)
  async handleCollabJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { fileId: string; projectId: string },
  ) {
    const { fileId, projectId } = payload ?? {};

    if (!fileId || !projectId || typeof fileId !== 'string' || typeof projectId !== 'string') {
      socket.emit(COLLAB_EVENTS.SYNC, {
        fileId: fileId ?? null,
        error: 'Invalid payload: fileId and projectId required',
      });
      return;
    }

    let project: Awaited<ReturnType<ProjectRepository['findById']>> | null = null;
    try {
      project = await this.projectRepository.findById(projectId);
    } catch {
      socket.emit(COLLAB_EVENTS.SYNC, { fileId, error: 'Invalid projectId' });
      return;
    }
    if (!project) {
      socket.emit(COLLAB_EVENTS.SYNC, { fileId, error: 'Project not found' });
      return;
    }
    const userId = socket.data?.user?.id?.toString() ?? socket.data?.userId;
    if (!userId || project.userId.toString() !== userId.toString()) {
      socket.emit(COLLAB_EVENTS.SYNC, { fileId, error: 'Unauthorized for project' });
      return;
    }

    try {
      const file = await this.fileRepository.getFile(BigInt(fileId));
      if (!file) {
        socket.emit(COLLAB_EVENTS.SYNC, { fileId, error: 'File not found' });
        return;
      }
      if (file.projectId.toString() !== projectId.toString()) {
        socket.emit(COLLAB_EVENTS.SYNC, { fileId, error: 'File does not belong to project' });
        return;
      }
    } catch {
      socket.emit(COLLAB_EVENTS.SYNC, { fileId, error: 'Invalid fileId' });
      return;
    }

    const { userId: presenceUserId, userName } = this.presenceIdentity(socket);
    const occupancy = await this.collabService.joinFile(
      fileId,
      projectId,
      socket.id,
      presenceUserId,
      userName,
    );

    await socket.join(`file:${fileId}`);

    for (const left of occupancy.left) {
      this.broadcastPresenceLeave(left);
    }
    this.broadcastPresenceJoin(occupancy.viewer);

    socket.emit(COLLAB_EVENTS.SYNC, {
      fileId,
      fromVersion: 0,
      updates: [],
    });

    socket.emit(COLLAB_EVENTS.AWARENESS_STATE, {
      fileId,
      peers: await this.collabService.listAwareness(fileId, socket.id),
    });

    this.logger.log(`Socket ${socket.id} joined file room: ${fileId}`);
  }

  @SubscribeMessage(COLLAB_EVENTS.LEAVE)
  async handleCollabLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { fileId: string },
  ) {
    const fileId = payload?.fileId;
    if (!fileId || typeof fileId !== 'string') return;

    await socket.leave(`file:${fileId}`);
    await this.broadcastAwarenessLeave(fileId, socket.id);
    const left = await this.collabService.leaveFile(fileId, socket.id);
    if (left) {
      this.broadcastPresenceLeave(left);
    }

    this.logger.log(`Socket ${socket.id} left file room: ${fileId}`);
  }

  @SubscribeMessage(COLLAB_EVENTS.UPDATE)
  async handleCollabUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    payload: {
      fileId: string;
      updates: { clientID: string; changes: unknown }[];
      version: number;
      document?: string;
    },
  ) {
    return { accepted: false, fileId: payload?.fileId ?? null, fromVersion: 0, version: 0, updates: [], error: 'Document editing is disabled' };
  }

  @SubscribeMessage(COLLAB_EVENTS.AWARENESS)
  async handleAwareness(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    payload: {
      fileId: string;
      awareness: {
        selection?: AwarenessSelection | AwarenessSelection[] | null;
        mouse?: { x: number; y: number } | null;
      };
    },
  ) {
    if (!payload?.fileId || typeof payload.fileId !== 'string') return;
    if (!socket.rooms.has(`file:${payload.fileId}`)) {
      this.logger.debug(`Awareness from socket not in room file=${payload.fileId} socket=${socket.id}`);
      return;
    }

    const { userId, userName } = this.presenceIdentity(socket);
    const state = await this.collabService.setAwareness(payload.fileId, {
      socketId: socket.id,
      userId,
      userName,
      selection: payload.awareness?.selection,
      mouse: payload.awareness?.mouse,
    });

    socket.to(`file:${payload.fileId}`).emit(COLLAB_EVENTS.AWARENESS, {
      fileId: payload.fileId,
      type: 'update',
      ...state,
    });
  }

  private presenceIdentity(socket: Socket) {
    const user = socket.data?.user;
    const userId = socket.data?.userId ?? user?.id?.toString() ?? socket.id;
    const userName =
      user?.username ||
      user?.email ||
      `User ${String(userId).slice(-4)}`;

    return { userId: String(userId), userName: String(userName) };
  }

  private broadcastPresenceJoin(viewer: {
    socketId: string;
    userId: string;
    userName: string;
    fileId: string;
    projectId: string;
  }) {
    this.server.to(`project:${viewer.projectId}`).emit(COLLAB_EVENTS.PRESENCE, {
      type: 'join',
      projectId: viewer.projectId,
      viewer,
    });
  }

  private broadcastPresenceLeave(viewer: {
    socketId: string;
    fileId: string;
    projectId: string;
  }) {
    this.server.to(`project:${viewer.projectId}`).emit(COLLAB_EVENTS.PRESENCE, {
      type: 'leave',
      fileId: viewer.fileId,
      socketId: viewer.socketId,
      projectId: viewer.projectId,
    });
  }

  private async broadcastAwarenessLeave(fileId: string, socketId: string) {
    const removed = await this.collabService.removeAwareness(fileId, socketId);
    if (!removed) return;
    this.server.to(`file:${fileId}`).emit(COLLAB_EVENTS.AWARENESS, {
      fileId,
      socketId,
      type: 'leave',
    });
  }
}
