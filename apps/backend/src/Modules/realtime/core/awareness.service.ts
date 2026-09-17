import { Injectable, OnModuleInit } from '@nestjs/common';
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
  selection: AwarenessSelection | AwarenessSelection[] | null | undefined,
): AwarenessSelection[] | null | undefined {
  if (selection === undefined) return undefined;
  if (selection === null) return null;

  const list = Array.isArray(selection) ? selection : [selection];

  const valid = list.filter(
    (range) =>
      range && Number.isFinite(range.anchor) && Number.isFinite(range.head),
  );

  return valid.length ? valid : null;
}

const AWARENESS_TTL_SECONDS = 60 * 30;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Golden-angle palette: distinct hues that stay readable against dark editors.
const STABLE_HUES = [35, 80, 140, 190, 250, 315, 15, 55, 120, 225];

function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const sat = 65 + Math.floor(Math.random() * 20);
  const light = 55 + Math.floor(Math.random() * 15);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

// Deterministic per user: the same user always gets the same color, regardless
// of which socket (or on whichever render) they are seen.
function getStableColor(userId: string, socketId: string): string {
  const seed = hashString(`${userId}:${socketId}`);
  const hue = STABLE_HUES[seed % STABLE_HUES.length] + (seed % 20);
  return `hsl(${hue}, 72%, 60%)`;
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
export class AwarenessService implements OnModuleInit {
  constructor(private readonly redisService: RedisService) {}

  async onModuleInit(): Promise<void> {
    await this.scanAndDelete('awareness:*');
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
            if (
              other &&
              other.userId === state.userId &&
              other.color === candidate
            ) {
              collision = true;
              break;
            }
          }
          if (collision) {
            const alt = generateRandomColor();
            if (alt !== candidate) {
              color = alt;
            } else {
              const used = new Set<string>();
              for (const v of Object.values(all)) {
                const o = safeParseAwareness(v);
                if (o && o.userId === state.userId && o.color)
                  used.add(o.color);
              }
              let altColor = generateRandomColor();
              while (used.has(altColor)) {
                altColor = generateRandomColor();
              }
              color = altColor;
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

  async removeAwareness(fileId: string, socketId: string): Promise<boolean> {
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
