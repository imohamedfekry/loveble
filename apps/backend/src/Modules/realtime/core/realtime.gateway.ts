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

  private fileRooms = new Map<string, Set<string>>();
  private socketFiles = new Map<string, Set<string>>();

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
    await this.leaveAllFileRooms(socket);
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
      viewers: this.collabService.listProjectViewers(projectId),
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
    @MessageBody() payload: { fileId: string; projectId: string; initialContent: string },
  ) {
    const { fileId, projectId, initialContent } = payload ?? {};

    if (!fileId || !projectId || typeof fileId !== 'string' || typeof projectId !== 'string') {
      socket.emit(COLLAB_EVENTS.SYNC, {
        fileId: fileId ?? null,
        error: 'Invalid payload: fileId and projectId required',
      });
      return;
    }

    // تحقق ملكية المشروع
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

    // تحقق أن الملف ينتمي للمشروع
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
      // لو fileId ليس BigInt صالح، نعتبره خطأ
      socket.emit(COLLAB_EVENTS.SYNC, { fileId, error: 'Invalid fileId' });
      return;
    }

    const { userId: presenceUserId, userName } = this.presenceIdentity(socket);
    const occupancy = this.collabService.joinFile(
      fileId,
      projectId,
      socket.id,
      presenceUserId,
      userName,
    );

    await socket.join(`file:${fileId}`);
    this.addToFileRoom(fileId, socket.id);
    this.addSocketFile(socket.id, fileId);

    for (const left of occupancy.left) {
      this.broadcastPresenceLeave(left);
    }
    this.broadcastPresenceJoin(occupancy.viewer);

    const snapshot = this.collabService.getSnapshot(
      fileId,
      typeof initialContent === 'string' ? initialContent : '',
    );

    socket.emit(COLLAB_EVENTS.SYNC, {
      fileId,
      version: snapshot.version,
      document: snapshot.document,
      fromVersion: snapshot.version,
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
    this.removeFromFileRoom(fileId, socket.id);
    this.removeSocketFile(socket.id, fileId);
    await this.broadcastAwarenessLeave(fileId, socket.id);
    const left = this.collabService.leaveFile(fileId, socket.id);
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
    const { fileId, updates: clientUpdates, version, document } = payload ?? {};
    if (!fileId || typeof fileId !== 'string') {
      return { accepted: false, fileId: fileId ?? null, fromVersion: 0, version: 0, updates: [] };
    }
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
      return { accepted: false, fileId, fromVersion: 0, version: 0, updates: [] };
    }
    if (clientUpdates && !Array.isArray(clientUpdates)) {
      return { accepted: false, fileId, fromVersion: version, version: 0, updates: [] };
    }

    const result = this.collabService.pushUpdates(
      fileId,
      version,
      clientUpdates ?? [],
      document,
    );

    if (!result) {
      return {
        accepted: false,
        fileId,
        fromVersion: version,
        version: 0,
        updates: [],
      };
    }

    const body = {
      fileId,
      accepted: result.accepted,
      fromVersion: result.fromVersion,
      version: result.version,
      updates: result.updates,
      document: result.document,
    };

    if (result.accepted && result.updates.length > 0) {
      socket.to(`file:${fileId}`).emit(COLLAB_EVENTS.UPDATE, body);
    }

    return body;
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
    // تحقق أن الـ socket داخل الغرفة (منع spoofing لملف لم ينضم إليه)
    const files = this.socketFiles.get(socket.id);
    if (!files || !files.has(payload.fileId)) {
      // السماح مؤقتاً لكن مع تحذير - يمكن تفعيل الحماية لاحقاً
      this.logger.debug(`Awareness from socket not in room file=${payload.fileId} socket=${socket.id}`);
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

  private addToFileRoom(fileId: string, socketId: string) {
    if (!this.fileRooms.has(fileId)) {
      this.fileRooms.set(fileId, new Set());
    }
    this.fileRooms.get(fileId)!.add(socketId);
  }

  private removeFromFileRoom(fileId: string, socketId: string) {
    const room = this.fileRooms.get(fileId);
    if (room) {
      room.delete(socketId);
      if (room.size === 0) {
        this.fileRooms.delete(fileId);
      }
    }
  }

  private addSocketFile(socketId: string, fileId: string) {
    if (!this.socketFiles.has(socketId)) {
      this.socketFiles.set(socketId, new Set());
    }
    this.socketFiles.get(socketId)!.add(fileId);
  }

  private removeSocketFile(socketId: string, fileId: string) {
    const files = this.socketFiles.get(socketId);
    if (files) {
      files.delete(fileId);
      if (files.size === 0) {
        this.socketFiles.delete(socketId);
      }
    }
  }

  private async leaveAllFileRooms(socket: Socket) {
    const files = this.socketFiles.get(socket.id);
    if (files) {
      for (const fileId of files) {
        this.removeFromFileRoom(fileId, socket.id);
        await this.broadcastAwarenessLeave(fileId, socket.id);
      }
      this.socketFiles.delete(socket.id);
    }

    for (const left of this.collabService.leaveSocket(socket.id)) {
      this.broadcastPresenceLeave(left);
    }
  }
}
