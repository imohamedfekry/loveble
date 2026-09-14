import { Injectable, Logger } from '@nestjs/common';
import { ChangeSet, Text } from '@codemirror/state';
import { RedisService } from 'src/common/redis/redis.service';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { StorageService } from 'src/Modules/storage/storage.service';
import { InngestService } from 'src/common/inngest/inngest.service';

export type StoredUpdate = {
    clientID: string;
    changes: unknown; // ناتج ChangeSet.toJSON() من الفرونت
};

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

    constructor(
        private readonly redisService: RedisService,
        private readonly fileRepository: FileRepository,
        private readonly storageService: StorageService,
        private readonly inngestService: InngestService,
    ) { }

    private contentKey(fileId: string) { return `doc:${fileId}:content`; }
    private updatesKey(fileId: string) { return `doc:${fileId}:updates`; }
    private lockKey(fileId: string) { return `doc:${fileId}:lock`; }
    private metaKey(fileId: string) { return `doc:${fileId}:meta`; }
    private persistedVersionKey(fileId: string) { return `doc:${fileId}:persistedVersion`; }

    private get redis() {
        const c = this.redisService.getClient();
        if (!c) throw new Error('Redis client not initialized');
        return c;
    }

    private async acquireLock(fileId: string): Promise<string> {
        const token = Math.random().toString(36).slice(2);
        for (let i = 0; i < this.LOCK_MAX_RETRIES; i++) {
            const ok = await this.redis.set(this.lockKey(fileId), token, 'PX', this.LOCK_TTL_MS, 'NX');
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
            // Ensure meta is cached for Inngest persistence
            if (!(await this.redis.exists(this.metaKey(fileId)))) {
                const file = await this.fileRepository.getFile(BigInt(fileId));
                if (file?.storageKey) {
                    await this.redis.set(this.metaKey(fileId), JSON.stringify({ storageKey: file.storageKey, projectId: file.projectId.toString() }));
                    // Initialize persistedVersion if not set
                    if (!(await this.redis.exists(this.persistedVersionKey(fileId)))) {
                        const v = await this.redis.llen(this.updatesKey(fileId));
                        await this.redis.set(this.persistedVersionKey(fileId), String(v));
                    }
                }
            }
            return;
        }

        const token = await this.acquireLock(fileId);
        try {
            if (!(await this.redis.exists(this.contentKey(fileId)))) {
                const content = await this.loadFromPersistence(fileId);
                await this.redis.set(this.contentKey(fileId), content);
                const file = await this.fileRepository.getFile(BigInt(fileId));
                if (file?.storageKey) {
                    await this.redis.set(this.metaKey(fileId), JSON.stringify({ storageKey: file.storageKey, projectId: file.projectId.toString() }));
                }
                const v = await this.redis.llen(this.updatesKey(fileId));
                await this.redis.set(this.persistedVersionKey(fileId), String(v));
            }
        } finally {
            await this.releaseLock(fileId, token);
        }
    }

    private async loadFromPersistence(fileId: string): Promise<string> {
        const file = await this.fileRepository.getFile(BigInt(fileId));
        if (!file?.storageKey) return '';
        try {
            return (await this.storageService.getFileContent(file.storageKey)).content;
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
            this.redis.llen(this.updatesKey(fileId)),
        ]);
        return { doc: content ?? '', version };
    }

    /** للعملاء اللي متأخرين عن الـ version الحالي */
    async pullUpdates(fileId: string, fromVersion: number): Promise<StoredUpdate[]> {
        const raw = await this.redis.lrange(this.updatesKey(fileId), fromVersion, -1);
        return raw.map((r) => JSON.parse(r));
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
        const token = await this.acquireLock(fileId);
        try {
            const currentVersion = await this.redis.llen(this.updatesKey(fileId));

            this.logger.debug(
                `[pushUpdates] file=${fileId} expectedVersion=${expectedVersion} currentVersion=${currentVersion} updatesCount=${updates.length}`,
            );

            if (currentVersion !== expectedVersion) {
                const missing = await this.pullUpdates(fileId, expectedVersion);
                this.logger.warn(
                    `[pushUpdates] VERSION MISMATCH file=${fileId} expected=${expectedVersion} actual=${currentVersion} → sending ${missing.length} missing updates`,
                );
                return { accepted: false, version: currentVersion, missing, updates: missing, fromVersion: expectedVersion };
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
                    };
                }

                doc = changeSet.apply(doc);
            }

            const pipeline = this.redis.pipeline();
            for (const u of updates) pipeline.rpush(this.updatesKey(fileId), JSON.stringify(u));
            pipeline.set(this.contentKey(fileId), doc.toString());
            await pipeline.exec();

            this.logger.debug(
                `[pushUpdates] file=${fileId} SUCCESS newVersion=${currentVersion + updates.length} newDocLength=${doc.length}`,
            );

            // Trigger debounced persistence via Inngest (per fileId) + direct fallback
            try {
                const metaRaw = await this.redis.get(this.metaKey(fileId));
                let projectId = '';
                if (metaRaw) {
                    try { projectId = JSON.parse(metaRaw).projectId ?? ''; } catch {}
                }
                // Fire and forget — Inngest will debounce per fileId (if Inngest dev server is running)
                this.inngestService.send('file/persist', { fileId, projectId, version: currentVersion + updates.length }).catch(() => {});
            } catch {}
            // Direct in-process debounce fallback — ensures S3 is actually written even when Inngest is not running
            this.schedulePersist(fileId);

            return { accepted: true, version: currentVersion + updates.length };
        } catch (err) {
            this.logger.error(`[pushUpdates] EXCEPTION file=${fileId}: ${err instanceof Error ? err.stack : err}`);
            return { accepted: false, version: 0, error: err instanceof Error ? err.message : String(err) };
        } finally {
            await this.releaseLock(fileId, token);
        }
    }

    /** Debounced direct persist fallback — works even when Inngest dev server is not running */
    private schedulePersist(fileId: string): void {
        // Debounce: reset 2s timer on every edit
        const existing = this.persistTimers.get(fileId);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(() => {
            this.persistTimers.delete(fileId);
            this.persistToS3(fileId).catch((err) => this.logger.error(`direct persist failed ${fileId}: ${err}`));
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
                this.persistToS3(fileId).catch((err) => this.logger.error(`direct persist (max) failed ${fileId}: ${err}`));
            }, this.PERSIST_TIMEOUT_MS);
            this.persistMaxTimers.set(fileId, maxTimer);
        }
    }

    private async persistToS3(fileId: string): Promise<void> {
        const content = await this.redis.get(this.contentKey(fileId));
        if (content === null) return;

        const [currentVersion, persistedVersionStr, metaRaw] = await Promise.all([
            this.redis.llen(this.updatesKey(fileId)),
            this.redis.get(this.persistedVersionKey(fileId)),
            this.redis.get(this.metaKey(fileId)),
        ]);

        const persistedVersion = parseInt(persistedVersionStr ?? '0', 10) || 0;
        if (currentVersion <= persistedVersion) return;

        let storageKey: string | null = null;
        let projectId = '';
        if (metaRaw) {
            try {
                const meta = JSON.parse(metaRaw);
                storageKey = meta.storageKey ?? null;
                projectId = meta.projectId ?? '';
            } catch {}
        }
        if (!storageKey) {
            const file = await this.fileRepository.getFile(BigInt(fileId));
            storageKey = file?.storageKey ?? null;
            projectId = file?.projectId?.toString() ?? projectId;
            if (storageKey) {
                await this.redis.set(this.metaKey(fileId), JSON.stringify({ storageKey, projectId }));
            }
        }
        if (!storageKey) {
            this.logger.warn(`persistToS3 skip ${fileId}: missing storageKey`);
            return;
        }

        // Re-check version after potential concurrent edits before S3 write
        const versionBeforeWrite = await this.redis.llen(this.updatesKey(fileId));
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

        const newCurrentVersion = await this.redis.llen(this.updatesKey(fileId));
        if (newCurrentVersion > currentVersion) {
            // New edits arrived during S3 write — remain dirty
            this.schedulePersist(fileId);
            return;
        }

        await this.redis.set(this.persistedVersionKey(fileId), String(currentVersion));

        const bytes = Buffer.byteLength(content, 'utf8');
        const now = new Date().toISOString();
        const line = '═'.repeat(78);
        const banner = [
            '',
            `╔${line}╗`,
            `║  📦  S3 PERSISTED  —  Direct debounced (2s / timeout 10s)${' '.repeat(27)}║`,
            `║  ${line}  ║`,
            `║  fileId      : ${fileId.padEnd(58)}║`,
            `║  projectId   : ${projectId.padEnd(58)}║`,
            `║  storageKey  : ${storageKey.padEnd(58)}║`,
            `║  version     : ${String(currentVersion).padEnd(58)}║`,
            `║  bytes       : ${String(bytes).padEnd(58)}║`,
            `║  persistedAt : ${now.padEnd(58)}║`,
            `║  source      : Redis hot → S3 (direct)${' '.repeat(37)}║`,
            `╚${line}╝`,
            '',
        ].join('\n');
        // eslint-disable-next-line no-console
        console.log(banner);
        this.logger.log(`S3 persisted ${fileId} v${currentVersion} ${bytes}B`);
    }

    /** بتتنادى لما آخر مستخدم يسيب الملف، بعد ما الـ checkpoint يتحفظ في S3 */
    async unload(fileId: string): Promise<void> {
        // Flush any pending debounce before unload
        const timer = this.persistTimers.get(fileId);
        if (timer) {
            clearTimeout(timer);
            this.persistTimers.delete(fileId);
            await this.persistToS3(fileId).catch(() => {});
        }
        const maxTimer = this.persistMaxTimers.get(fileId);
        if (maxTimer) {
            clearTimeout(maxTimer);
            this.persistMaxTimers.delete(fileId);
        }
        await this.redis.del(this.contentKey(fileId), this.updatesKey(fileId), this.persistedVersionKey(fileId), this.metaKey(fileId));
    }
}