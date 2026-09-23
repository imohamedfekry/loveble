import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from './queue.constants';
import type {
  CreateProjectJobData,
  CrawlJobData,
  GenerateTextJobData,
  PersistFileJobData,
} from './queue.types';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.CRAWL) private readonly crawlQueue: Queue,
    @InjectQueue(QUEUE_NAMES.GENERATE_TEXT)
    private readonly generateTextQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CREATE_PROJECT)
    private readonly createProjectQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PERSIST_FILE)
    private readonly persistFileQueue: Queue,
  ) {}

  crawl(data: CrawlJobData) {
    return this.crawlQueue.add(JOB_NAMES.CRAWL_RUN, data, { attempts: 2 });
  }

  generateText(data: GenerateTextJobData) {
    return this.generateTextQueue.add(JOB_NAMES.TEXT_GENERATE, data, {
      attempts: 3,
    });
  }

  createProject(data: CreateProjectJobData) {
    return this.createProjectQueue.add(JOB_NAMES.PROJECT_CREATE, data, {
      attempts: 3,
    });
  }

  persistFile(data: PersistFileJobData) {
    const fileId = String(data.fileId);
    return this.persistFileQueue.add(
      JOB_NAMES.FILE_PERSIST,
      { ...data, fileId },
      {
        attempts: 3,
        deduplication: { id: fileId, ttl: 2000, extend: true, replace: true },
      },
    );
  }
}
