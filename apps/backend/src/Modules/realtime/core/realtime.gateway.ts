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

  constructor(
    private readonly connectionHandler: ConnectionHandler,
    private readonly projectRepository: ProjectRepository,
  ) { }

  handleConnection(socket: Socket) {
    return this.connectionHandler.handleConnect(socket);
  }

  handleDisconnect(socket: Socket) {
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
}
