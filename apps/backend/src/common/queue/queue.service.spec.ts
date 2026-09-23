import { QueueService } from './queue.service';
import { JOB_NAMES } from './queue.constants';

describe('QueueService', () => {
  const crawlQueue = { add: jest.fn() };
  const generateTextQueue = { add: jest.fn() };
  const createProjectQueue = { add: jest.fn() };
  const persistFileQueue = { add: jest.fn() };

  const service = new QueueService(
    crawlQueue as any,
    generateTextQueue as any,
    createProjectQueue as any,
    persistFileQueue as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enqueues crawl jobs with 2 attempts', async () => {
    await service.crawl({ urls: ['https://example.com'] });
    expect(crawlQueue.add).toHaveBeenCalledWith(
      JOB_NAMES.CRAWL_RUN,
      { urls: ['https://example.com'] },
      { attempts: 2 },
    );
  });

  it('debounces persist jobs per fileId', async () => {
    await service.persistFile({ fileId: '42', projectId: '9' });
    expect(persistFileQueue.add).toHaveBeenCalledWith(
      JOB_NAMES.FILE_PERSIST,
      { fileId: '42', projectId: '9' },
      {
        attempts: 3,
        deduplication: { id: '42', ttl: 2000, extend: true, replace: true },
      },
    );
  });
});
