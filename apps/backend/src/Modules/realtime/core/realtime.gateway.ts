import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConnectionHandler } from './connection.handler';

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(private readonly connectionHandler: ConnectionHandler) {}

  handleConnection(socket: Socket) {
    this.connectionHandler.handleConnect(socket);
  }

  handleDisconnect(socket: Socket) {
    this.connectionHandler.handleDisconnect(socket);
  }
}
