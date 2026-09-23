import { CrawlProcessor } from './crawl.processor';
import { runCrawlPipeline } from 'src/common/scraping/crawl-pipeline';

jest.mock('src/common/scraping/crawl-pipeline', () => ({
  runCrawlPipeline: jest.fn(),
}));

jest.mock('src/common/utils/capture-errors', () => ({
  captureErrors: jest.fn((fn: () => Promise<unknown>) => fn()),
}));

const runCrawlPipelineMock = runCrawlPipeline as jest.MockedFunction<
  typeof runCrawlPipeline
>;

describe('CrawlProcessor', () => {
  const processor = new CrawlProcessor();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an empty urls payload', async () => {
    await expect(
      processor.process({ id: '1', name: 'crawl/run', data: { urls: [] } } as any),
    ).rejects.toThrow('non-empty urls array');
    expect(runCrawlPipelineMock).not.toHaveBeenCalled();
  });

  it('runs the crawl pipeline for valid urls', async () => {
    runCrawlPipelineMock.mockResolvedValue({
      count: 1,
      data: [{ url: 'https://example.com', title: 'Example', content: 'hi' }],
    });

    await expect(
      processor.process({
        id: '2',
        name: 'crawl/run',
        data: { urls: ['https://example.com'] },
      } as any),
    ).resolves.toEqual({
      count: 1,
      data: [{ url: 'https://example.com', title: 'Example', content: 'hi' }],
    });
  });
});
