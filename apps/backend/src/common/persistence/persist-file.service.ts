import { Logger, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { RedisService } from 'src/common/redis/redis.service';
import { StorageService } from 'src/Modules/storage/storage.service';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';

const MAX_BUFFERED_UPDATES = 500;

export type PersistResult =
  | {
      skipped: true;
      reason: string;
      fileId?: string;
      currentVersion?: number;
      persistedVersion?: number;
    }
  | {
      persisted: false;
      reason: string;
      fileId: string;
      storageKey: string;
      persistedVersion: number;
      currentVersion: number;
      attemptedVersion: number;
    }
  | {
      persisted: true;
      fileId: string;
      projectId: string;
      storageKey: string;
      version: number;
      bytes: number;
    };

/**
 * Shared Redis-hot-state → S3 persist logic used by the Inngest
 * persist-file function and by document-state unload (sync path).
 */
@Injectable()
export class PersistFileService {
  private readonly logger = new Logger(PersistFileService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly storageService: StorageService,
    private readonly fileRepository: FileRepository,
  ) {}

  async persist(data: {
    fileId: string;
    projectId?: string;
  }): Promise<PersistResult> {
    const fileId = String(data.fileId ?? '');

    if (!fileId) {
      return { skipped: true, reason: 'missing fileId' };
    }

    return this.persistToS3(fileId);
  }

  private async persistToS3(fileId: string): Promise<PersistResult> {
    const redis = this.redisService.ensureClient();
    const contentKey = `doc:${fileId}:content`;
    const updatesKey = `doc:${fileId}:updates`;
    const persistedKey = `doc:${fileId}:persistedVersion`;
    const metaKey = `doc:${fileId}:meta`;

    const [content, metaRaw, persistedVersionStr] = await Promise.all([
      redis.get(contentKey),
      redis.get(metaKey),
      redis.get(persistedKey),
    ]);

    if (content === null) {
      return { skipped: true, reason: 'no hot content', fileId };
    }

    const meta = this.parseMeta(metaRaw);
    const baseVersion = meta?.baseVersion ?? 0;
    const len = await redis.llen(updatesKey);
    const currentVersion = baseVersion + len;
    const persistedVersion = parseInt(persistedVersionStr ?? '0', 10) || 0;

    if (currentVersion <= persistedVersion) {
      return {
        skipped: true,
        reason: 'already persisted',
        fileId,
        currentVersion,
        persistedVersion,
      };
    }

    let storageKey: string | null = meta?.storageKey ?? null;
    let resolvedProjectId: string = meta?.projectId ?? '';

    if (!storageKey) {
      const file = await this.fileRepository.getFile(BigInt(fileId));
      storageKey = file?.storageKey ?? null;
      resolvedProjectId = file?.projectId?.toString() ?? resolvedProjectId;
      if (storageKey && meta) {
        await redis.set(metaKey, JSON.stringify({ ...meta, storageKey }));
      }
    }

    if (!storageKey) {
      return {
        skipped: true,
        reason: 'missing storageKey',
        fileId,
        currentVersion,
        persistedVersion,
      };
    }

    await this.storageService.updateFileContent(storageKey, content);

    const newLen = await redis.llen(updatesKey);
    const newCurrentVersion = baseVersion + newLen;
    if (newCurrentVersion > currentVersion) {
      return {
        persisted: false,
        reason: 'new edits during persist',
        fileId,
        storageKey,
        persistedVersion,
        currentVersion: newCurrentVersion,
        attemptedVersion: currentVersion,
      };
    }

    await redis.set(persistedKey, String(currentVersion));
    await this.compactUpdates(fileId, redis, metaKey);

    const bytes = Buffer.byteLength(content, 'utf8');
    this.logger.log(`S3 persisted ${fileId} v${currentVersion} ${bytes}B`);

    return {
      persisted: true,
      fileId,
      projectId: resolvedProjectId,
      storageKey,
      version: currentVersion,
      bytes,
    };
  }

  private parseMeta(
    raw: string | null,
  ): { storageKey?: string; projectId?: string; baseVersion: number } | null {
    if (!raw) return null;
    try {
      const meta = JSON.parse(raw) as {
        storageKey?: string;
        projectId?: string;
        baseVersion?: number;
      };
      return {
        storageKey: meta.storageKey ?? undefined,
        projectId: meta.projectId ?? undefined,
        baseVersion: Number(meta.baseVersion ?? 0) || 0,
      };
    } catch {
      this.logger.warn(`invalid meta JSON`);
      return null;
    }
  }

  private async compactUpdates(
    fileId: string,
    redis: Redis,
    metaKey: string,
  ): Promise<void> {
    const updatesKey = `doc:${fileId}:updates`;
    const len = await redis.llen(updatesKey);
    if (len <= MAX_BUFFERED_UPDATES) return;

    const trimCount = len - MAX_BUFFERED_UPDATES;
    const metaRaw = await redis.get(metaKey);
    const meta = this.parseMeta(metaRaw);

    const pipeline = redis.pipeline();
    pipeline.ltrim(updatesKey, trimCount, -1);
    await pipeline.exec();

    if (meta) {
      await redis.set(
        metaKey,
        JSON.stringify({
          ...(meta.storageKey ? { storageKey: meta.storageKey } : {}),
          ...(meta.projectId ? { projectId: meta.projectId } : {}),
          baseVersion: (meta.baseVersion ?? 0) + trimCount,
        }),
      );
    }
  }
}
