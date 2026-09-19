import { Injectable, Logger } from '@nestjs/common';
import { ChangeSet, Text } from '@codemirror/state';
import { RedisService } from 'src/common/redis/redis.service';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { StorageService } from 'src/Modules/storage/storage.service';

export type StoredUpdate = {
  clientID: string;
  changes: unknown; // ناتج ChangeSet.toJSON() من الفرونت
};

type DocumentMeta = {
  storageKey?: string;
  projectId?: string;
  baseVersion: number;
};

// Hot state never lives in Redis longer than this. It is a safety net only:
// normal operation clears keys on last-leave (unload) and refreshes TTL on
// every edit, so an actively edited file is never evicted.
const HOT_STATE_TTL_SECONDS = 24 * 60 * 60;
// Above this many buffered updates, the oldest edits are compacted away into a
// baseVersion counter so `updates` cannot grow unboundedly.
const MAX_BUFFERED_UPDATES = 500;

@Injectable()
export class DocumentStateService {
  private readonly logger = new Logger(DocumentStateService.name);
  private readonly LOCK_TTL_MS = 4000;
  private readonly LOCK_RETRY_MS = 30;
  private readonly LOCK_MAX_RETRIES = 150;
  private readonly PERSIST_DEBOUNCE_MS = 2000;
  private readonly PERSIST_TIMEOUT_MS = 10000;
  private readonly persistTimers = new Map<string, NodeJS.Timeout>();
  private readonly persistMaxTimers = new Map<string, NodeJS.Timeout>();
  private readonly persisting = new Set<string>();

  constructor(
    private readonly redisService: RedisService,
    private readonly fileRepository: FileRepository,
    private readonly storageService: StorageService,
  ) {}

  private contentKey(fileId: string) {
    return `doc:${fileId}:content`;
  }
  private updatesKey(fileId: string) {
    return `doc:${fileId}:updates`;
  }
  private lockKey(fileId: string) {
    return `doc:${fileId}:lock`;
  }
  private metaKey(fileId: string) {
    return `doc:${fileId}:meta`;
  }
  private persistedVersionKey(fileId: string) {
    return `doc:${fileId}:persistedVersion`;
  }

  private get redis() {
    const c = this.redisService.getClient();
    if (!c) throw new Error('Redis client not initialized');
    return c;
  }

  private async readMeta(fileId: string): Promise<DocumentMeta | null> {
    const raw = await this.redis.get(this.metaKey(fileId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<DocumentMeta>;
      return {
        storageKey: parsed.storageKey ?? undefined,
        projectId: parsed.projectId ?? undefined,
        baseVersion: Number(parsed.baseVersion ?? 0) || 0,
      };
    } catch {
      return null;
    }
  }

  private async writeMeta(fileId: string, meta: DocumentMeta): Promise<void> {
    await this.redis.set(
      this.metaKey(fileId),
      JSON.stringify(meta),
      'EX',
      HOT_STATE_TTL_SECONDS,
    );
  }

  /** Absolute doc version = baseVersion (compacted away) + buffered update count. */
  private async currentVersion(fileId: string): Promise<number> {
    const [meta, len] = await Promise.all([
      this.readMeta(fileId),
      this.redis.llen(this.updatesKey(fileId)),
    ]);
    return (meta?.baseVersion ?? 0) + len;
  }

  private async acquireLock(fileId: string): Promise<string> {
    const token = Math.random().toString(36).slice(2);
    for (let i = 0; i < this.LOCK_MAX_RETRIES; i++) {
      const ok = await this.redis.set(
        this.lockKey(fileId),
        token,
        'PX',
        this.LOCK_TTL_MS,
        'NX',
      );
      if (ok) return token;
      await new Promise((r) => setTimeout(r, this.LOCK_RETRY_MS));
    }
    throw new Error(`Could not acquire lock for file ${fileId}`);
  }

  private async releaseLock(fileId: string, token: string) {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      end
      return 0`;
    await this.redis.eval(script, 1, this.lockKey(fileId), token);
  }

  /** لو المستند مش موجود في Redis، حمّله من S3 (lazy load) */
  private async ensureLoaded(fileId: string): Promise<void> {
    if (await this.redis.exists(this.contentKey(fileId))) {
      // Ensure meta is cached for persistence
      if (!(await this.redis.exists(this.metaKey(fileId)))) {
        const file = await this.fileRepository.getFile(BigInt(fileId));
        if (file?.storageKey) {
          await this.writeMeta(fileId, {
            storageKey: file.storageKey,
            projectId: file.projectId.toString(),
            baseVersion: 0,
          });
          // Initialize persistedVersion if not set
          if (!(await this.redis.exists(this.persistedVersionKey(fileId)))) {
            const v = await this.currentVersion(fileId);
            await this.redis.set(
              this.persistedVersionKey(fileId),
              String(v),
              'EX',
              HOT_STATE_TTL_SECONDS,
            );
          }
        }
      }
      return;
    }

    const token = await this.acquireLock(fileId);
    try {
      if (!(await this.redis.exists(this.contentKey(fileId)))) {
        const content = await this.loadFromPersistence(fileId);
        await this.redis.set(
          this.contentKey(fileId),
          content,
          'EX',
          HOT_STATE_TTL_SECONDS,
        );
        const file = await this.fileRepository.getFile(BigInt(fileId));
        if (file?.storageKey) {
          await this.writeMeta(fileId, {
            storageKey: file.storageKey,
            projectId: file.projectId.toString(),
            baseVersion: 0,
          });
        }
        const v = await this.currentVersion(fileId);
        await this.redis.set(
          this.persistedVersionKey(fileId),
          String(v),
          'EX',
          HOT_STATE_TTL_SECONDS,
        );
      }
    } finally {
      await this.releaseLock(fileId, token);
    }
  }

  private async loadFromPersistence(fileId: string): Promise<string> {
    const file = await this.fileRepository.getFile(BigInt(fileId));
    if (!file?.storageKey) return '';
    try {
      return (await this.storageService.getFileContent(file.storageKey))
        .content;
    } catch (err) {
      this.logger.error(`failed to load ${fileId} from S3: ${err}`);
      return '';
    }
  }

  /** بيتنادى عند join: يرجّع المحتوى الحالي كامل + رقم النسخة */
  async getDocument(fileId: string): Promise<{ doc: string; version: number }> {
    await this.ensureLoaded(fileId);
    const [content, version] = await Promise.all([
      this.redis.get(this.contentKey(fileId)),
      this.currentVersion(fileId),
    ]);
    return { doc: content ?? '', version };
  }

  /** للعملاء اللي متأخرين عن الـ version الحالي */
  private async pullUpdates(
    fileId: string,
    fromVersion: number,
  ): Promise<{ updates: StoredUpdate[]; forceResync?: boolean }> {
    const base = (await this.readMeta(fileId))?.baseVersion ?? 0;
    const len = await this.redis.llen(this.updatesKey(fileId));

    // Client is behind the compaction point — we cannot reconstruct the
    // missing edits from the buffer. Ask them to do a full resync instead.
    if (fromVersion < base || fromVersion > base + len) {
      return { updates: [], forceResync: true };
    }

    const raw = await this.redis.lrange(
      this.updatesKey(fileId),
      fromVersion - base,
      -1,
    );
    return { updates: raw.map((r) => JSON.parse(r) as StoredUpdate) };
  }

  /** قلب البروتوكول: قبول التحديث بس لو الـ version مطابق تمامًا */
  async pushUpdates(
    fileId: string,
    expectedVersion: number,
    updates: StoredUpdate[],
  ): Promise<{
    accepted: boolean;
    version: number;
    missing?: StoredUpdate[];
    updates?: StoredUpdate[];
    fromVersion?: number;
    forceResync?: boolean;
    error?: string;
    doc?: string;
    document?: string;
  }> {
    await this.ensureLoaded(fileId);
    if (updates.length === 0) {
      const currentVersion = await this.currentVersion(fileId);
      if (currentVersion === expectedVersion) {
        return { accepted: true, version: currentVersion };
      }
      const { updates: missing, forceResync } = await this.pullUpdates(
        fileId,
        expectedVersion,
      );
      if (forceResync) {
        const content = (await this.redis.get(this.contentKey(fileId))) ?? '';
        return {
          accepted: false,
          version: currentVersion,
          forceResync: true,
          doc: content,
          document: content,
        };
      }
      return {
        accepted: false,
        version: currentVersion,
        missing,
        updates: missing,
        fromVersion: expectedVersion,
      };
    }
    const token = await this.acquireLock(fileId);
    try {
      const currentVersion = await this.currentVersion(fileId);

      this.logger.debug(
        `[pushUpdates] file=${fileId} expectedVersion=${expectedVersion} currentVersion=${currentVersion} updatesCount=${updates.length}`,
      );

      if (currentVersion !== expectedVersion) {
        const { updates: missing, forceResync } = await this.pullUpdates(
          fileId,
          expectedVersion,
        );
        this.logger.warn(
          `[pushUpdates] VERSION MISMATCH file=${fileId} expected=${expectedVersion} actual=${currentVersion} → sending ${missing.length} missing updates${forceResync ? ' (resync)' : ''}`,
        );
        if (forceResync) {
          const content = (await this.redis.get(this.contentKey(fileId))) ?? '';
          return {
            accepted: false,
            version: currentVersion,
            forceResync: true,
            doc: content,
            document: content,
          };
        }
        return {
          accepted: false,
          version: currentVersion,
          missing,
          updates: missing,
          fromVersion: expectedVersion,
        };
      }

      const currentContent = await this.redis.get(this.contentKey(fileId));
      const contentStr = currentContent ?? '';
      let doc = Text.of(contentStr.split('\n'));

      this.logger.debug(
        `[pushUpdates] file=${fileId} currentDocLength=${doc.length} currentDocLines=${doc.lines}`,
      );

      for (const [i, u] of updates.entries()) {
        const changeSet = ChangeSet.fromJSON(u.changes);
        this.logger.debug(
          `[pushUpdates] file=${fileId} update[${i}] clientID=${u.clientID} changeSetLength(before)=${changeSet.length} docLength=${doc.length}`,
        );

        if (changeSet.length !== doc.length) {
          this.logger.error(
            `[pushUpdates] LENGTH MISMATCH file=${fileId} update[${i}] changeSet.length=${changeSet.length} !== doc.length=${doc.length}. Forcing full resync for this client.`,
          );
          return {
            accepted: false,
            version: currentVersion,
            error: `Length mismatch: client is desynced`,
            forceResync: true,
            doc: doc.toString(), // ⬅️ المستند الصحيح الحالي كامل
            document: doc.toString(),
          };
        }

        doc = changeSet.apply(doc);
      }

      const pipeline = this.redis.pipeline();
      for (const u of updates)
        pipeline.rpush(this.updatesKey(fileId), JSON.stringify(u));
      pipeline.set(this.contentKey(fileId), doc.toString());
      pipeline.expire(this.contentKey(fileId), HOT_STATE_TTL_SECONDS);
      pipeline.expire(this.updatesKey(fileId), HOT_STATE_TTL_SECONDS);
      pipeline.expire(this.metaKey(fileId), HOT_STATE_TTL_SECONDS);
      pipeline.expire(this.persistedVersionKey(fileId), HOT_STATE_TTL_SECONDS);
      await pipeline.exec();

      this.logger.debug(
        `[pushUpdates] file=${fileId} SUCCESS newVersion=${currentVersion + updates.length} newDocLength=${doc.length}`,
      );

      // Single persistence path: debounced in-process fallback that always
      // works (no external Inngest dev server required).
      this.schedulePersist(fileId);

      return { accepted: true, version: currentVersion + updates.length };
    } catch (err) {
      this.logger.error(
        `[pushUpdates] EXCEPTION file=${fileId}: ${err instanceof Error ? err.stack : err}`,
      );
      return {
        accepted: false,
        version: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      await this.releaseLock(fileId, token);
    }
  }

  /** Debounced direct persist — the single source of S3 writes. */
  private schedulePersist(fileId: string): void {
    // Debounce: reset 2s timer on every edit
    const existing = this.persistTimers.get(fileId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.persistTimers.delete(fileId);
      this.persistToS3(fileId).catch((err) =>
        this.logger.error(`direct persist failed ${fileId}: ${err}`),
      );
      // Clear max timeout since we just persisted
      const maxTimer = this.persistMaxTimers.get(fileId);
      if (maxTimer) {
        clearTimeout(maxTimer);
        this.persistMaxTimers.delete(fileId);
      }
    }, this.PERSIST_DEBOUNCE_MS);
    this.persistTimers.set(fileId, timer);

    // Max timeout: ensure persist at least every 10s during continuous typing
    if (!this.persistMaxTimers.has(fileId)) {
      const maxTimer = setTimeout(() => {
        const debounced = this.persistTimers.get(fileId);
        if (debounced) {
          clearTimeout(debounced);
          this.persistTimers.delete(fileId);
        }
        this.persistMaxTimers.delete(fileId);
        this.persistToS3(fileId).catch((err) =>
          this.logger.error(`direct persist (max) failed ${fileId}: ${err}`),
        );
      }, this.PERSIST_TIMEOUT_MS);
      this.persistMaxTimers.set(fileId, maxTimer);
    }
  }

  private async persistToS3(fileId: string): Promise<void> {
    // Guard against overlapping persists (debounce + max timers).
    if (this.persisting.has(fileId)) return;
    this.persisting.add(fileId);
    try {
      await this.doPersistToS3(fileId);
    } finally {
      this.persisting.delete(fileId);
    }
  }

  private async doPersistToS3(fileId: string): Promise<void> {
    const content = await this.redis.get(this.contentKey(fileId));
    if (content === null) return;

    const [currentVersion, persistedVersionStr, meta] = await Promise.all([
      this.currentVersion(fileId),
      this.redis.get(this.persistedVersionKey(fileId)),
      this.readMeta(fileId),
    ]);

    const persistedVersion = parseInt(persistedVersionStr ?? '0', 10) || 0;
    if (currentVersion <= persistedVersion) return;

    let storageKey = meta?.storageKey ?? null;
    let projectId = meta?.projectId ?? '';
    if (!storageKey) {
      const file = await this.fileRepository.getFile(BigInt(fileId));
      storageKey = file?.storageKey ?? null;
      projectId = file?.projectId?.toString() ?? projectId;
      if (storageKey) {
        await this.writeMeta(fileId, {
          storageKey,
          projectId,
          baseVersion: meta?.baseVersion ?? 0,
        });
      }
    }
    if (!storageKey) {
      this.logger.warn(`persistToS3 skip ${fileId}: missing storageKey`);
      return;
    }

    // Re-check version after potential concurrent edits before S3 write
    const versionBeforeWrite = await this.currentVersion(fileId);
    if (versionBeforeWrite !== currentVersion) {
      // New edits arrived, let next debounce handle latest
      this.schedulePersist(fileId);
      return;
    }

    try {
      await this.storageService.updateFileContent(storageKey, content);
    } catch (err) {
      this.logger.error(`S3 put failed ${fileId} ${storageKey}: ${err}`);
      throw err;
    }

    const newCurrentVersion = await this.currentVersion(fileId);
    if (newCurrentVersion > currentVersion) {
      // New edits arrived during S3 write — remain dirty
      this.schedulePersist(fileId);
      return;
    }

    await this.redis.set(
      this.persistedVersionKey(fileId),
      String(currentVersion),
      'EX',
      HOT_STATE_TTL_SECONDS,
    );

    await this.compactUpdates(fileId);

    const bytes = Buffer.byteLength(content, 'utf8');
    this.logger.log(`S3 persisted ${fileId} v${currentVersion} ${bytes}B`);
  }

  /** Compact the buffered updates list by folding the oldest edits into baseVersion. */
  private async compactUpdates(fileId: string): Promise<void> {
    const len = await this.redis.llen(this.updatesKey(fileId));
    if (len <= MAX_BUFFERED_UPDATES) return;

    const trimCount = len - MAX_BUFFERED_UPDATES;
    const meta = (await this.readMeta(fileId)) ?? { baseVersion: 0 };

    const pipeline = this.redis.pipeline();
    pipeline.ltrim(this.updatesKey(fileId), trimCount, -1);
    await pipeline.exec();

    await this.writeMeta(fileId, {
      ...(meta.storageKey ? { storageKey: meta.storageKey } : {}),
      ...(meta.projectId ? { projectId: meta.projectId } : {}),
      baseVersion: (meta.baseVersion ?? 0) + trimCount,
    });
  }

  /** بتتنادى لما آخر مستخدم يسيب الملف، بعد ما الـ checkpoint يتحفظ في S3 */
  async unload(fileId: string): Promise<void> {
    this.cancelTimers(fileId);

    await this.persistToS3(fileId).catch((err) => {
      this.logger.error(`unload persist failed ${fileId}: ${err}`);
    });

    await this.redis.del(
      this.contentKey(fileId),
      this.updatesKey(fileId),
      this.persistedVersionKey(fileId),
      this.metaKey(fileId),
    );
  }

  cancelTimers(fileId: string): void {
    const timer = this.persistTimers.get(fileId);
    if (timer) {
      clearTimeout(timer);
      this.persistTimers.delete(fileId);
    }
    const maxTimer = this.persistMaxTimers.get(fileId);
    if (maxTimer) {
      clearTimeout(maxTimer);
      this.persistMaxTimers.delete(fileId);
    }
  }
}
