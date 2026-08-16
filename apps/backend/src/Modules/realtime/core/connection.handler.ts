import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ConnectionManager } from './connection.manager';
import { SocketAuthService } from './socket-auth.service';
import { parseCookie } from 'cookie';

@Injectable()
export class ConnectionHandler {
  private readonly logger = new Logger(ConnectionHandler.name);

  constructor(
    private readonly connectionManager: ConnectionManager,
    private readonly authService: SocketAuthService,
  ) { }

  async handleConnect(socket: Socket) {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      const token = rawCookie ? parseCookie(rawCookie).Authorization : undefined;
      console.log(`Extracted token: ${token} from socket: ${socket.id}`);
      if (!token) {
        this.logger.warn(
          `Connection attempt without token (socket: ${socket.id})`,
        );
        socket.disconnect();
        return;
      }
      const user = await this.authService.validateToken(token);
      socket.data.user = user;
      socket.data.userId = user.id.toString();
      socket.join(`user:${user.id}`);
      this.connectionManager.addConnection(socket.data.userId, socket);
      this.logger.log(`User ${socket.data.userId} connected (${socket.id})`);
    } catch (err) {
      this.logger.error(`Connection failed: ${err}`);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    this.connectionManager.removeConnection(socket.id);
    this.logger.log(`Socket disconnected: ${socket.id}`);
  }
}
