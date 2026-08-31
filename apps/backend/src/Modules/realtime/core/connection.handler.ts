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
  ) {}

  private extractToken(socket: Socket): string | undefined {
    // 1) Authorization cookie
    const rawCookie = socket.handshake.headers.cookie;
    if (rawCookie) {
      try {
        const cookies = parseCookie(rawCookie);
        if (cookies.Authorization) return cookies.Authorization;
        if (cookies.authorization) return cookies.authorization;
        if (cookies.access_token) return cookies.access_token;
      } catch {}
    }

    // 2) handshake.auth.token (يستخدمه كثير من عملاء socket.io)
    const authToken =
      (socket.handshake.auth as Record<string, unknown>)?.token ??
      (socket.handshake.auth as Record<string, unknown>)?.authorization;
    if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();

    // 3) Authorization header (Bearer ...)
    const header = socket.handshake.headers.authorization;
    if (typeof header === 'string' && header.trim()) return header.trim();

    return undefined;
  }

  async handleConnect(socket: Socket) {
    try {
      const rawToken = this.extractToken(socket);

      if (!rawToken) {
        this.logger.warn(`Connection attempt without token (socket: ${socket.id})`);
        socket.emit('connect:error', { message: 'Unauthorized: missing token' });
        socket.disconnect(true);
        return;
      }

      const user = await this.authService.validateToken(rawToken);
      socket.data.user = user;
      socket.data.userId = user.id.toString();
      // استخدام toString لتجنب BigInt issues
      await socket.join(`user:${user.id.toString()}`);
      this.connectionManager.addConnection(socket.data.userId, socket);
      this.logger.log(`User ${socket.data.userId} connected (${socket.id})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Connection failed socket=${socket.id}: ${message}`);
      try {
        socket.emit('connect:error', { message: 'Unauthorized' });
      } catch {}
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    this.connectionManager.removeConnection(socket.id);
    this.logger.log(`Socket disconnected: ${socket.id}`);
  }
}
