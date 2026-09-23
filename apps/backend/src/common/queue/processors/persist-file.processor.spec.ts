import { PersistFileProcessor } from './persist-file.processor';

jest.mock('src/Modules/storage/storage.service', () => ({
  StorageService: class StorageService {},
}));

jest.mock('src/common/utils/capture-errors', () => ({
  captureErrors: jest.fn((fn: () => Promise<unknown>) => fn()),
}));

jest.mock('src/common/database/repositories/project/file.repository', () => ({
  FileRepository: class FileRepository {},
}));

describe('PersistFileProcessor', () => {
  const redis = {
    get: jest.fn(),
    llen: jest.fn(),
    set: jest.fn(),
    pipeline: jest.fn(() => ({
      ltrim: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
    })),
  };
  const redisService = {
    ensureClient: jest.fn(() => redis),
  };
  const storageService = {
    updateFileContent: jest.fn(),
  };
  const fileRepository = {
    getFile: jest.fn(),
  };

  const processor = new PersistFileProcessor(
    redisService as any,
    storageService as any,
    fileRepository as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redisService.ensureClient.mockReturnValue(redis);
    fileRepository.getFile.mockResolvedValue(null);
  });

  it('skips when fileId is missing', async () => {
    await expect(
      processor.process({ id: '1', data: { fileId: '' } } as any),
    ).resolves.toEqual({ skipped: true, reason: 'missing fileId' });
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('skips when hot content is absent', async () => {
    redis.get.mockResolvedValueOnce(null);

    await expect(
      processor.process({ id: '1', data: { fileId: '42' } } as any),
    ).resolves.toEqual({
      skipped: true,
      reason: 'no hot content',
      fileId: '42',
    });
  });

  it('skips when the current version is already persisted', async () => {
    redis.get.mockResolvedValueOnce('content');
    redis.get.mockResolvedValueOnce(null);
    redis.get.mockResolvedValueOnce('2');
    redis.llen.mockResolvedValueOnce(2);

    await expect(
      processor.process({ id: '1', data: { fileId: '42' } } as any),
    ).resolves.toMatchObject({
      skipped: true,
      reason: 'already persisted',
      currentVersion: 2,
      persistedVersion: 2,
    });
    expect(storageService.updateFileContent).not.toHaveBeenCalled();
  });

  it('skips when storageKey is missing', async () => {
    redis.get.mockResolvedValueOnce('content');
    redis.get.mockResolvedValueOnce(JSON.stringify({ projectId: '9' }));
    redis.get.mockResolvedValueOnce('1');
    redis.llen.mockResolvedValueOnce(3);
    fileRepository.getFile.mockResolvedValueOnce({ projectId: '9' });

    await expect(
      processor.process({ id: '1', data: { fileId: '42' } } as any),
    ).resolves.toMatchObject({ skipped: true, reason: 'missing storageKey' });
  });

  it('writes to storage and records the persisted version', async () => {
    redis.get.mockResolvedValueOnce('hello');
    redis.get.mockResolvedValueOnce(
      JSON.stringify({ storageKey: 'files/42.txt', projectId: '9' }),
    );
    redis.get.mockResolvedValueOnce('1');
    redis.llen.mockResolvedValueOnce(4);
    redis.llen.mockResolvedValueOnce(4);
    redis.set.mockResolvedValueOnce('OK');
    storageService.updateFileContent.mockResolvedValueOnce(undefined);

    await expect(
      processor.process({
        id: '1',
        data: { fileId: '42', projectId: 'fallback' },
      } as any),
    ).resolves.toMatchObject({
      persisted: true,
      fileId: '42',
      projectId: '9',
      storageKey: 'files/42.txt',
      version: 4,
    });

    expect(storageService.updateFileContent).toHaveBeenCalledWith(
      'files/42.txt',
      'hello',
    );
    expect(redis.set).toHaveBeenCalledWith('doc:42:persistedVersion', '4');
  });

  it('does not mark persisted when new edits arrive during the write', async () => {
    redis.get.mockResolvedValueOnce('hello');
    redis.get.mockResolvedValueOnce(
      JSON.stringify({ storageKey: 'files/42.txt' }),
    );
    redis.get.mockResolvedValueOnce('1');
    redis.llen.mockResolvedValueOnce(4);
    redis.llen.mockResolvedValueOnce(6);
    storageService.updateFileContent.mockResolvedValueOnce(undefined);

    await expect(
      processor.process({ id: '1', data: { fileId: '42' } } as any),
    ).resolves.toMatchObject({
      persisted: false,
      reason: 'new edits during persist',
      currentVersion: 6,
      attemptedVersion: 4,
    });
    expect(redis.set).not.toHaveBeenCalled();
  });
});
