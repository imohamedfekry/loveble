import { inngest } from '../client';
import Redis from 'ioredis';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Persist file content from Redis hot state to S3 (durable).
 * Debounced per fileId so rapid typing does not spam S3.
 * Uses latest state wins + persistedVersion check to avoid stale writes.
 */
export const persistFile = inngest.createFunction(
  {
    id: 'persist-file',
    name: 'Persist file to S3',
    retries: 3,
    concurrency: {
      limit: 1,
      key: 'event.data.fileId',
    },
    debounce: {
      key: 'event.data.fileId',
      period: '2s',
      timeout: '10s',
    },
    triggers: [{ event: 'file/persist' }],
  },
  async ({ event, step }) => {
    const fileId = String(event.data.fileId);
    const projectId = String(event.data.projectId ?? '');

    if (!fileId) {
      return { skipped: true, reason: 'missing fileId' };
    }

    const result = await step.run('persist-to-s3', async () => {
      const redisUrl = process.env.REDIS_URL;
      const bucket = process.env.S3_BUCKET ?? process.env.STORAGE_BUCKET ?? process.env.AWS_S3_BUCKET ?? '';
      const region = process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
      const endpoint = process.env.S3_ENDPOINT;
      const accessKeyId = process.env.S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;

      if (!bucket) {
        throw new Error('S3 bucket not configured for persistFile');
      }

      const redis = redisUrl
        ? new Redis(redisUrl, { maxRetriesPerRequest: 2, enableReadyCheck: false })
        : new Redis({
            host: process.env.REDIS_HOST ?? 'localhost',
            port: Number(process.env.REDIS_PORT ?? 6379),
            username: process.env.REDIS_USERNAME,
            password: process.env.REDIS_PASSWORD,
            db: Number(process.env.REDIS_DB ?? 0),
            maxRetriesPerRequest: 2,
            enableReadyCheck: false,
          });

      try {
        const contentKey = `doc:${fileId}:content`;
        const updatesKey = `doc:${fileId}:updates`;
        const persistedKey = `doc:${fileId}:persistedVersion`;
        const metaKey = `doc:${fileId}:meta`;

        const [content, currentVersion, persistedVersionStr, metaRaw] = await Promise.all([
          redis.get(contentKey),
          redis.llen(updatesKey),
          redis.get(persistedKey),
          redis.get(metaKey),
        ]);

        if (content === null) {
          return { skipped: true, reason: 'no hot content', fileId };
        }

        const persistedVersion = parseInt(persistedVersionStr ?? '0', 10) || 0;

        if (currentVersion <= persistedVersion) {
          return { skipped: true, reason: 'already persisted', fileId, currentVersion, persistedVersion };
        }

        let storageKey: string | null = null;
        let resolvedProjectId = projectId;
        if (metaRaw) {
          try {
            const meta = JSON.parse(metaRaw);
            storageKey = meta.storageKey ?? null;
            resolvedProjectId = meta.projectId ?? projectId;
          } catch {}
        }

        if (!storageKey) {
          return { skipped: true, reason: 'missing storageKey', fileId, currentVersion, persistedVersion };
        }

        const s3 = new S3Client({
          region,
          endpoint,
          credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
          forcePathStyle: !!endpoint,
        });

        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: storageKey,
            Body: content,
            ContentType: 'text/plain; charset=utf-8',
          }),
        );

        // Re-check version after S3 write: if new edits arrived during write, remain dirty
        const newCurrentVersion = await redis.llen(updatesKey);
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

        const bytes = Buffer.byteLength(content, 'utf8');
        const now = new Date().toISOString();
        const line = '═'.repeat(78);
        const banner = [
          '',
          `╔${line}╗`,
          `║  📦  S3 PERSISTED  —  Inngest debounced (2s / timeout 10s)${' '.repeat(26)}║`,
          `║  ${line}  ║`,
          `║  fileId      : ${fileId.padEnd(58)}║`,
          `║  projectId   : ${resolvedProjectId.padEnd(58)}║`,
          `║  storageKey  : ${storageKey.padEnd(58)}║`,
          `║  version     : ${String(currentVersion).padEnd(58)}║`,
          `║  bytes       : ${String(bytes).padEnd(58)}║`,
          `║  persistedAt : ${now.padEnd(58)}║`,
          `║  source      : Redis hot → S3 (collab)${' '.repeat(36)}║`,
          `╚${line}╝`,
          '',
        ].join('\n');
        console.log(banner);

        return {
          persisted: true,
          fileId,
          projectId: resolvedProjectId,
          storageKey,
          version: currentVersion,
          bytes,
        };
      } finally {
        redis.disconnect();
      }
    });

    return result;
  },
);
