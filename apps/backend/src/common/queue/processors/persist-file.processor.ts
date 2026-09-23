import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { RedisService } from 'src/common/redis/redis.service';
import { captureErrors } from 'src/common/utils/capture-errors';
import { StorageService } from 'src/Modules/storage/storage.service';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { QUEUE_NAMES } from '../queue.constants';
import type { PersistFileJobData } from '../queue.types';

const MAX_BUFFERED_UPDATES = 500;

type PersistResult =
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

@Processor(QUEUE_NAMES.PERSIST_FILE, { concurrency: 4 })
export class PersistFileProcessor extends WorkerHost {
  private readonly logger = new Logger(PersistFileProcessor.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly storageService: StorageService,
    private readonly fileRepository: FileRepository,
  ) {
    super();
  }

  async process(job: Job<PersistFileJobData>) {
    return captureErrors(
      () => this.persist(job.data),
      {
        queue: QUEUE_NAMES.PERSIST_FILE,
        jobId: job.id,
        fileId: job.data.fileId,
      },
    );
  }

  private async persist(data: PersistFileJobData): Promise<PersistResult> {
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

    const meta = metaRaw ? this.parseMeta(metaRaw) : null;
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
    let resolvedProjectId = meta?.projectId ?? '';

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

  private parseMeta(raw: string): { storageKey?: string; projectId?: string; baseVersion: number } | null {
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

  private async compactUpdates(fileId: string, redis: Redis, metaKey: string): Promise<void> {
    const len = await redis.llen(`doc:${fileId}:updates`);
    if (len <= MAX_BUFFERED_UPDATES) return;

    const trimCount = len - MAX_BUFFERED_UPDATES;
    const metaRaw = await redis.get(metaKey);
    const meta = metaRaw ? this.parseMeta(metaRaw) : null;

    const pipeline = redis.pipeline();
    pipeline.ltrim(`doc:${fileId}:updates`, trimCount, -1);
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
