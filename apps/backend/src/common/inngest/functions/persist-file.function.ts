import { inngest } from '../client';
import { getNestApp } from '../nest-context';
import { PersistFileService } from 'src/common/persistence/persist-file.service';

export const persistFileFunction = inngest.createFunction(
  {
    id: 'persist-file',
    name: 'Persist file to S3',
    retries: 3,
    concurrency: { limit: 4, key: 'event.data.fileId' },
    debounce: {
      key: 'event.data.fileId',
      period: '2s',
      timeout: '10s',
    },
    triggers: [{ event: 'file/persist' }],
  },
  async ({ event, step }) => {
    const fileId = String(event.data?.fileId ?? '');
    const projectId = event.data?.projectId
      ? String(event.data.projectId)
      : undefined;

    if (!fileId) {
      return { skipped: true, reason: 'missing fileId' };
    }

    return step.run('persist-to-s3', async () => {
      const app = getNestApp();
      const persistService = app.get(PersistFileService);
      return persistService.persist({ fileId, projectId });
    });
  },
);
