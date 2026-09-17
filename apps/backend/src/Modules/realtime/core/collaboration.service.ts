import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

import {
  AwarenessService,
  AwarenessSelection,
  AwarenessState,
} from './awareness.service';
import { RedisService } from 'src/common/redis/redis.service';

export type FileViewer = {
  socketId: string;
  userId: string;
  userName: string;
  fileId: string;
  projectId: string;
};

@Injectable()
export class CollaborationService implements OnModuleInit {
  constructor(
    private readonly awarenessService: AwarenessService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.scanAndDelete('collab:*');
  }

  private async scanAndDelete(pattern: string): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;
    try {
      let cursor = '0';
      do {
        const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      // ignore errors on startup flush
    }
  }

  private getRedis(): Redis {
    const redis = this.redisService.getClient();
    if (!redis) {
      throw new Error('Redis client is not initialized');
    }
    return redis;
  }

  private projectKey(projectId: string): string {
    return `collab:project:${projectId}`;
  }

  private socketKey(socketId: string): string {
    return `collab:socket:${socketId}`;
  }

  async setAwareness(
    fileId: string,
    state: {
      socketId: string;
      userId: string;
      userName: string;
      selection?: AwarenessSelection | AwarenessSelection[] | null;
      mouse?: { x: number; y: number } | null;
    },
  ): Promise<AwarenessState> {
    return this.awarenessService.setAwareness(fileId, state);
  }

  async listAwareness(
    fileId: string,
    exceptSocketId?: string,
  ): Promise<AwarenessState[]> {
    return this.awarenessService.listAwareness(fileId, exceptSocketId);
  }

  async removeAwareness(fileId: string, socketId: string): Promise<boolean> {
    return this.awarenessService.removeAwareness(fileId, socketId);
  }

  async joinFile(
    fileId: string,
    projectId: string,
    socketId: string,
    userId: string,
    userName: string,
  ): Promise<{ viewer: FileViewer; left: FileViewer[] }> {
    const left = await this.leaveSocket(socketId);

    const redis = this.getRedis();

    // Get all current viewers in the project
    const all = await redis.hgetall(this.projectKey(projectId));
    const existingNames = new Set<string>();
    for (const value of Object.values(all)) {
      try {
        const v: FileViewer = JSON.parse(value);
        existingNames.add(v.userName);
      } catch {
        // skip invalid
      }
    }

    // Pick a unique name
    let uniqueName = userName;
    if (existingNames.has(uniqueName)) {
      let i = 1;
      while (existingNames.has(`${userName} ${i}`)) {
        i++;
      }
      uniqueName = `${userName} ${i}`;
    }

    const viewer: FileViewer = {
      socketId,
      userId,
      userName: uniqueName,
      fileId,
      projectId,
    };

    const viewerJson = JSON.stringify(viewer);
    const pipeline = redis.pipeline();
    pipeline.hset(this.projectKey(projectId), socketId, viewerJson);
    pipeline.set(this.socketKey(socketId), viewerJson);
    await pipeline.exec();

    return { viewer, left };
  }

  async leaveFile(
    fileId: string,
    socketId: string,
  ): Promise<FileViewer | null> {
    const redis = this.getRedis();
    const socketJson = await redis.get(this.socketKey(socketId));
    if (!socketJson) return null;

    const viewer: FileViewer = JSON.parse(socketJson);
    if (viewer.fileId !== fileId) return null;

    const pipeline = redis.pipeline();
    pipeline.hdel(this.projectKey(viewer.projectId), socketId);
    pipeline.del(this.socketKey(socketId));
    await pipeline.exec();

    return viewer;
  }

  async leaveSocket(socketId: string): Promise<FileViewer[]> {
    const redis = this.getRedis();
    const socketJson = await redis.get(this.socketKey(socketId));
    if (!socketJson) return [];

    const viewer: FileViewer = JSON.parse(socketJson);

    const pipeline = redis.pipeline();
    pipeline.hdel(this.projectKey(viewer.projectId), socketId);
    pipeline.del(this.socketKey(socketId));
    await pipeline.exec();

    return [viewer];
  }

  async listProjectViewers(projectId: string): Promise<FileViewer[]> {
    const redis = this.getRedis();
    const all = await redis.hgetall(this.projectKey(projectId));
    const viewers: FileViewer[] = [];
    for (const [, value] of Object.entries(all)) {
      try {
        viewers.push(JSON.parse(value) as FileViewer);
      } catch {
        // skip invalid entries
      }
    }
    return viewers;
  }
}
