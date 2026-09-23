import { runCrawlPipeline } from 'src/common/scraping/crawl-pipeline';
import { crawlFunction } from './crawl.function';

type Handler = (ctx: {
  event: { name: string; data: Record<string, unknown> };
  step: {
    run: <T>(id: string, cb: () => T | Promise<T>) => Promise<T>;
  };
}) => Promise<unknown>;

jest.mock('../client', () => ({
  inngest: {
    createFunction: jest.fn(
      (a: unknown, b: unknown, c?: unknown): Handler =>
        (typeof b === 'function' ? b : (c as Handler)) as Handler,
    ),
  },
}));

jest.mock('src/common/scraping/crawl-pipeline', () => ({
  runCrawlPipeline: jest.fn(),
}));

const runCrawlPipelineMock = runCrawlPipeline as jest.MockedFunction<
  typeof runCrawlPipeline
>;

const handler = crawlFunction as unknown as Handler;

function invokeHandler(eventData: Record<string, unknown>) {
  return handler({
    event: { name: 'crawl/run', data: eventData },
    step: {
      run: (_id: string, cb: () => unknown) => Promise.resolve(cb()),
    },
  });
}

describe('crawlFunction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an empty urls payload', async () => {
    await expect(invokeHandler({ urls: [] })).rejects.toThrow(
      'non-empty urls array',
    );
    expect(runCrawlPipelineMock).not.toHaveBeenCalled();
  });

  it('runs the crawl pipeline for valid urls', async () => {
    runCrawlPipelineMock.mockResolvedValue({
      count: 1,
      data: [{ url: 'https://example.com', title: 'Example', content: 'hi' }],
    });

    await expect(
      invokeHandler({ urls: ['https://example.com'] }),
    ).resolves.toEqual({
      count: 1,
      data: [{ url: 'https://example.com', title: 'Example', content: 'hi' }],
    });
  });
});
