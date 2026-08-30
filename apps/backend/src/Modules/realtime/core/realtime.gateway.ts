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

import { ConnectionHandler } from './connection.handler';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { CollaborationService, type AwarenessSelection } from './collaboration.service';
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

  private fileRooms = new Map<string, Set<string>>();
  private socketFiles = new Map<string, Set<string>>();

  constructor(
    private readonly connectionHandler: ConnectionHandler,
    private readonly projectRepository: ProjectRepository,
    private readonly collabService: CollaborationService,
  ) { }

  handleConnection(socket: Socket) {
    return this.connectionHandler.handleConnect(socket);
  }

  handleDisconnect(socket: Socket) {
    this.leaveAllFileRooms(socket);
    return this.connectionHandler.handleDisconnect(socket);
  }

  @SubscribeMessage('project:subscribe')
  async subscribeToProject(
    @ConnectedSocket() socket: Socket,
    @MessageBody() projectId: string,
  ) {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      socket.emit('project:error', {
        message: 'Project not found',
      });

      return;
    }
    if (project.userId.toString() != socket?.data?.user?.id?.toString()) {
      console.log("faild to connect project with user id :", socket.data.user.id.toString())
      socket.emit('project:error', {
        message: 'Unauthorized',
      });
      return;
    }

    await socket.join(`project:${projectId}`);
    console.log(`user ${socket.data.userId} Connected To Project ${projectId}`);

    socket.emit('project:subscribed', {
      projectId,
    });
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
    await socket.leave(`project:${projectId}`);

    socket.emit('project:unsubscribed', {
      projectId,
    });
  }

  @SubscribeMessage(COLLAB_EVENTS.JOIN)
  async handleCollabJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { fileId: string; projectId: string; initialContent: string },
  ) {
    const { fileId, projectId, initialContent } = payload;

    if (!fileId || !projectId) {
      return;
    }

    const { userId, userName } = this.presenceIdentity(socket);
    const occupancy = this.collabService.joinFile(
      fileId,
      projectId,
      socket.id,
      userId,
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
      peers: this.collabService.listAwareness(fileId, socket.id),
    });

    console.log(`Socket ${socket.id} joined file room: ${fileId}`);
  }

  @SubscribeMessage(COLLAB_EVENTS.LEAVE)
  async handleCollabLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { fileId: string },
  ) {
    await socket.leave(`file:${payload.fileId}`);
    this.removeFromFileRoom(payload.fileId, socket.id);
    this.removeSocketFile(socket.id, payload.fileId);
    this.broadcastAwarenessLeave(payload.fileId, socket.id);
    const left = this.collabService.leaveFile(payload.fileId, socket.id);
    if (left) {
      this.broadcastPresenceLeave(left);
    }

    console.log(`Socket ${socket.id} left file room: ${payload.fileId}`);
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
    const { fileId, updates: clientUpdates, version, document } = payload;

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
    if (!payload?.fileId) return;

    const { userId, userName } = this.presenceIdentity(socket);
    const state = this.collabService.setAwareness(payload.fileId, {
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

  private broadcastAwarenessLeave(fileId: string, socketId: string) {
    const removed = this.collabService.removeAwareness(fileId, socketId);
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

  private leaveAllFileRooms(socket: Socket) {
    const files = this.socketFiles.get(socket.id);
    if (files) {
      for (const fileId of files) {
        this.removeFromFileRoom(fileId, socket.id);
        this.broadcastAwarenessLeave(fileId, socket.id);
      }
      this.socketFiles.delete(socket.id);
    }

    for (const left of this.collabService.leaveSocket(socket.id)) {
      this.broadcastPresenceLeave(left);
    }
  }
}
