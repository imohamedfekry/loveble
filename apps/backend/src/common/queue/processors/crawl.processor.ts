import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { runCrawlPipeline } from 'src/common/scraping/crawl-pipeline';
import { captureErrors } from 'src/common/utils/capture-errors';
import { QUEUE_NAMES } from '../queue.constants';
import type { CrawlJobData } from '../queue.types';

@Processor(QUEUE_NAMES.CRAWL)
export class CrawlProcessor extends WorkerHost {
  private readonly logger = new Logger(CrawlProcessor.name);

  async process(job: Job<CrawlJobData>) {
    return captureErrors(
      async () => {
        const urls = job.data.urls;
        if (!Array.isArray(urls) || urls.length === 0) {
          throw new Error('crawl job requires a non-empty urls array');
        }

        this.logger.debug(`crawl job ${job.id} urls=${urls.length}`);
        return runCrawlPipeline(urls);
      },
      { queue: QUEUE_NAMES.CRAWL, jobId: job.id, jobName: job.name },
    );
  }
}
