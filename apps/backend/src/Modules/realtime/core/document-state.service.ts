import { Injectable, Logger } from '@nestjs/common';
import { ChangeSet, Text } from '@codemirror/state';
import { RedisService } from 'src/common/redis/redis.service';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { StorageService } from 'src/Modules/storage/storage.service';
import { InngestService } from 'src/common/inngest/inngest.service';
import { PersistFileService } from 'src/common/persistence/persist-file.service';
import { ProjectRevisionService } from './project-revision.service';

export type StoredUpdate = {
  clientID: string;
  changes: unknown;
};

type DocumentMeta = {
  storageKey?: string;
  projectId?: string;
  baseVersion: number;
};

const HOT_STATE_TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class DocumentStateService {
  private readonly logger = new Logger(DocumentStateService.name);
  private readonly LOCK_TTL_MS = 4000;
  private readonly LOCK_RETRY_MS = 30;
  private readonly LOCK_MAX_RETRIES = 150;

  constructor(
    private readonly redisService: RedisService,
    private readonly fileRepository: FileRepository,
    private readonly storageService: StorageService,
    private readonly inngestService: InngestService,
    private readonly persistFileService: PersistFileService,
    private readonly projectRevision: ProjectRevisionService,
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

  private async ensureLoaded(fileId: string): Promise<void> {
    if (await this.redis.exists(this.contentKey(fileId))) {
      if (!(await this.redis.exists(this.metaKey(fileId)))) {
        const file = await this.fileRepository.getFile(BigInt(fileId));
        if (file?.storageKey) {
          await this.writeMeta(fileId, {
            storageKey: file.storageKey,
            projectId: file.projectId.toString(),
            baseVersion: 0,
          });
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
    if (!file?.storageKey || file.isBinary) return '';
    try {
      return (await this.storageService.getFileContent(file.storageKey))
        .content;
    } catch (err) {
      this.logger.error(`failed to load ${fileId} from S3: ${err}`);
      return '';
    }
  }

  async getDocument(fileId: string): Promise<{ doc: string; version: number }> {
    await this.ensureLoaded(fileId);
    const [content, version] = await Promise.all([
      this.redis.get(this.contentKey(fileId)),
      this.currentVersion(fileId),
    ]);
    return { doc: content ?? '', version };
  }

  private async pullUpdates(
    fileId: string,
    fromVersion: number,
  ): Promise<{ updates: StoredUpdate[]; forceResync?: boolean }> {
    const base = (await this.readMeta(fileId))?.baseVersion ?? 0;
    const len = await this.redis.llen(this.updatesKey(fileId));

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
    try {
      await this.ensureLoaded(fileId);
    } catch (err) {
      this.logger.error(
        `[pushUpdates] ensureLoaded failed file=${fileId}: ${err instanceof Error ? err.stack : err}`,
      );
      return {
        accepted: false,
        version: 0,
        error: 'Failed to load document state',
      };
    }
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
          `[pushUpdates] VERSION MISMATCH file=${fileId} expected=${expectedVersion} actual=${currentVersion} sending ${missing.length} missing updates${forceResync ? ' (resync)' : ''}`,
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

      for (const [i, u] of updates.entries()) {
        const changeSet = ChangeSet.fromJSON(u.changes);
        if (changeSet.length !== doc.length) {
          this.logger.error(
            `[pushUpdates] LENGTH MISMATCH file=${fileId} update[${i}] changeSet.length=${changeSet.length} !== doc.length=${doc.length}. Forcing full resync for this client.`,
          );
          return {
            accepted: false,
            version: currentVersion,
            error: `Length mismatch: client is desynced`,
            forceResync: true,
            doc: doc.toString(),
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

      void this.inngestService.persistFile({ fileId }).catch((err) => {
        this.logger.warn(
          `[pushUpdates] inngest persist enqueue failed file=${fileId}: ${err}`,
        );
      });

      await this.bumpProjectRevision(fileId);

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

  private async bumpProjectRevision(fileId: string): Promise<void> {
    try {
      const meta = await this.readMeta(fileId);
      let projectId = meta?.projectId;
      if (!projectId) {
        const file = await this.fileRepository.getFile(BigInt(fileId));
        projectId = file?.projectId?.toString();
      }
      if (!projectId) return;
      await this.projectRevision.bump(projectId, 'content', fileId, 'collab');
    } catch (err) {
      this.logger.warn(
        `[pushUpdates] revision bump failed file=${fileId}: ${String(err)}`,
      );
    }
  }

  async unload(fileId: string): Promise<void> {
    await this.persistFileService.persist({ fileId });

    await this.redis.del(
      this.contentKey(fileId),
      this.updatesKey(fileId),
      this.persistedVersionKey(fileId),
      this.metaKey(fileId),
    );
  }
}
