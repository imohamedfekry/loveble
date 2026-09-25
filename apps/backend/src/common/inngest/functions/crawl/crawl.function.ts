import { inngest } from '../../client';
import { runCrawlPipeline } from 'src/common/scraping/crawl-pipeline';

export const crawlFunction = inngest.createFunction(
  {
    id: 'crawl',
    name: 'Crawl URLs',
    retries: 2,
    triggers: [{ event: 'crawl/run' }],
  },
  async ({ event, step }) => {
    const urls = (event.data?.urls ?? []) as string[];
    if (!Array.isArray(urls) || urls.length === 0) {
      throw new Error('crawl job requires a non-empty urls array');
    }

    return step.run('crawl-pipeline', () => runCrawlPipeline(urls));
  },
);
