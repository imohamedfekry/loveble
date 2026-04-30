import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

interface ConnectedUser {
  userId: string;
  socketId: string;
}

@Injectable()
export class ConnectionManager {
  private sockets = new Map<string, ConnectedUser>(); // socketId → user
  private userSockets = new Map<string, Set<string>>(); // userId → socketIds

  addConnection(userId: string, socket: Socket) {
    const socketId = socket.id;

    this.sockets.set(socketId, { userId, socketId });

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

  getSocketsByUser(userId: string) {
    return this.userSockets.get(userId) || new Set();
  }

  isUserOnline(userId: string) {
    return this.userSockets.has(userId);
  }
}