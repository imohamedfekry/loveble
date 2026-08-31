import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

interface ConnectedUser {
  userId: string;
  socketId: string;
  connectedAt: number;
}

@Injectable()
export class ConnectionManager {
  private readonly logger = new Logger(ConnectionManager.name);

  private sockets = new Map<string, ConnectedUser>(); // socketId → user
  private userSockets = new Map<string, Set<string>>(); // userId → socketIds

  addConnection(userId: string, socket: Socket) {
    const socketId = socket.id;

    // تنظيف قديم لو نفس socketId موجود (إعادة اتصال سريعة)
    const existing = this.sockets.get(socketId);
    if (existing && existing.userId !== userId) {
      this.logger.warn(`Socket ${socketId} reassigned from ${existing.userId} to ${userId}`);
      const oldSet = this.userSockets.get(existing.userId);
      if (oldSet) {
        oldSet.delete(socketId);
        if (oldSet.size === 0) this.userSockets.delete(existing.userId);
      }
    }

    this.sockets.set(socketId, { userId, socketId, connectedAt: Date.now() });

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  removeConnection(socketId: string) {
    const user = this.sockets.get(socketId);
    if (!user) return;

    this.sockets.delete(socketId);

    const sockets = this.userSockets.get(user.userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(user.userId);
      }
    }
  }

  getUserBySocket(socketId: string) {
    return this.sockets.get(socketId);
  }

  getSocketsByUser(userId: string): ReadonlySet<string> {
    return this.userSockets.get(userId) ?? new Set<string>();
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  getTotalSocketCount(): number {
    return this.sockets.size;
  }

  // للتشخيص
  getAllOnlineUsers(): string[] {
    return [...this.userSockets.keys()];
  }
}
