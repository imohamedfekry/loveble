import { INNGEST_EVENTS, InngestService } from './inngest.service';

const sendMock = jest.fn().mockResolvedValue({ ids: ['evt_1'] });

jest.mock('./client', () => ({
  inngest: {
    send: (...args: unknown[]): Promise<unknown> =>
      sendMock(...args) as Promise<unknown>,
  },
}));

describe('InngestService', () => {
  const service = new InngestService();

  beforeEach(() => {
    sendMock.mockClear();
  });

  it('sends crawl events with urls', async () => {
    await service.crawl(['https://example.com']);
    expect(sendMock).toHaveBeenCalledWith({
      name: INNGEST_EVENTS.CRAWL_RUN,
      data: { urls: ['https://example.com'] },
    });
  });

  it('normalizes fileId to string on persist', async () => {
    await service.persistFile({ fileId: 42 as unknown as string });
    expect(sendMock).toHaveBeenCalledWith({
      name: INNGEST_EVENTS.FILE_PERSIST,
      data: { fileId: '42' },
    });
  });

  it('sends generate-text events', async () => {
    await service.generateText({
      prompt: 'hi',
      model: 'google:gemini-2.5-flash',
    });
    expect(sendMock).toHaveBeenCalledWith({
      name: INNGEST_EVENTS.TEXT_GENERATE,
      data: { prompt: 'hi', model: 'google:gemini-2.5-flash' },
    });
  });

  it('sends create-project events', async () => {
    await service.createProject({ prompt: 'todo app' });
    expect(sendMock).toHaveBeenCalledWith({
      name: INNGEST_EVENTS.PROJECT_CREATE,
      data: { prompt: 'todo app' },
    });
  });
});
