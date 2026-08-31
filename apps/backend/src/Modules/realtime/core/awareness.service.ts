import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { RedisService } from 'src/common/redis/redis.service';

export type AwarenessSelection = {
  anchor: number;
  head: number;
};

export type AwarenessState = {
  socketId: string;
  userId: string;
  userName: string;
  selection: AwarenessSelection[] | null;
  mouse: { x: number; y: number } | null;
  color: string;
};

function normalizeSelection(
  selection:
    | AwarenessSelection
    | AwarenessSelection[]
    | null
    | undefined,
): AwarenessSelection[] | null | undefined {
  if (selection === undefined) return undefined;
  if (selection === null) return null;

  const list = Array.isArray(selection) ? selection : [selection];

  const valid = list.filter(
    (range) =>
      range &&
      Number.isFinite(range.anchor) &&
      Number.isFinite(range.head),
  );

  return valid.length ? valid : null;
}

const AWARENESS_TTL_SECONDS = 60 * 30;

const CURSOR_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F8C471',
  '#82E0AA',
  '#F1948A',
  '#AED6F1',
  '#ABEBC6',
  '#F5CBA7',
  '#D7BDE2',
  '#A9CCE3',
  '#F9E79F',
  '#EDBB99',
] as const;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getStableColor(userId: string, socketId: string): string {
  const key = userId && userId !== socketId ? userId : socketId;
  const idx = hashString(key) % CURSOR_COLORS.length;
  return CURSOR_COLORS[idx];
}

function safeParseAwareness(raw: string): AwarenessState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AwarenessState>;
    if (!parsed || typeof parsed.socketId !== 'string') return null;
    return parsed as AwarenessState;
  } catch {
    return null;
  }
}

@Injectable()
export class AwarenessService {
  constructor(private readonly redisService: RedisService) {}

  private getRedis(): Redis {
    const redis = this.redisService.getClient();

    if (!redis) {
      throw new Error('Redis client is not initialized');
    }

    return redis;
  }

  private key(fileId: string): string {
    return `awareness:${fileId}`;
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
    const redis = this.getRedis();
    const key = this.key(fileId);

    const raw = await redis.hget(key, state.socketId);
    const current: AwarenessState | null = raw ? safeParseAwareness(raw) : null;

    let color = current?.color;
    if (!color) {
      const candidate = getStableColor(state.userId, state.socketId);
      if (!current) {
        try {
          const all = await redis.hgetall(key);
          let collision = false;
          for (const [otherSid, rawOther] of Object.entries(all)) {
            if (otherSid === state.socketId) continue;
            const other = safeParseAwareness(rawOther);
            if (other && other.userId === state.userId && other.color === candidate) {
              collision = true;
              break;
            }
          }
          if (collision) {
            const alt = CURSOR_COLORS[hashString(state.socketId) % CURSOR_COLORS.length];
            if (alt !== candidate) {
              color = alt;
            } else {
              const used = new Set<string>();
              for (const v of Object.values(all)) {
                const o = safeParseAwareness(v);
                if (o && o.userId === state.userId && o.color) used.add(o.color);
              }
              const free = CURSOR_COLORS.find((c) => !used.has(c));
              color = free ?? alt;
            }
          } else {
            color = candidate;
          }
        } catch {
          color = candidate;
        }
      } else {
        color = candidate;
      }
    }

    const next: AwarenessState = {
      socketId: state.socketId,
      userId: state.userId,
      userName: state.userName,
      color,
      selection:
        state.selection === undefined
          ? (current?.selection ?? null)
          : (normalizeSelection(state.selection) ?? null),
      mouse: state.mouse === undefined ? (current?.mouse ?? null) : state.mouse,
    };

    const pipeline = redis.pipeline();
    pipeline.hset(key, state.socketId, JSON.stringify(next));
    pipeline.expire(key, AWARENESS_TTL_SECONDS);
    await pipeline.exec();

    return next;
  }

  async listAwareness(
    fileId: string,
    exceptSocketId?: string,
  ): Promise<AwarenessState[]> {
    const redis = this.getRedis();
    const all = await redis.hgetall(this.key(fileId));
    const peers: AwarenessState[] = [];

    for (const [socketId, value] of Object.entries(all)) {
      if (socketId === exceptSocketId) continue;
      const parsed = safeParseAwareness(value);
      if (!parsed) continue;
      if (!parsed.color) {
        parsed.color = getStableColor(parsed.userId, parsed.socketId);
      }
      peers.push(parsed);
    }

    peers.sort((a, b) => a.socketId.localeCompare(b.socketId));
    return peers;
  }

  async removeAwareness(
    fileId: string,
    socketId: string,
  ): Promise<boolean> {
    const redis = this.getRedis();
    const key = this.key(fileId);
    const removed = await redis.hdel(key, socketId);
    if (removed > 0) {
      const remaining = await redis.hlen(key);
      if (remaining === 0) {
        await redis.del(key);
      }
    }
    return removed > 0;
  }
}
