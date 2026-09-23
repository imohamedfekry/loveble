import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { RedisService } from 'src/common/redis/redis.service';
import { StorageModule } from 'src/Modules/storage/storage.module';
import { CrawlProcessor } from './processors/crawl.processor';
import { CreateProjectProcessor } from './processors/create-project.processor';
import { GenerateTextProcessor } from './processors/generate-text.processor';
import { PersistFileProcessor } from './processors/persist-file.processor';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from './queue.constants';
import { QueueService } from './queue.service';

const queues = [
  { name: QUEUE_NAMES.CRAWL, attempts: 2 },
  { name: QUEUE_NAMES.GENERATE_TEXT, attempts: 3 },
  { name: QUEUE_NAMES.CREATE_PROJECT, attempts: 3 },
  { name: QUEUE_NAMES.PERSIST_FILE, attempts: 3 },
] as const;

@Global()
@Module({
  imports: [
    StorageModule,
    BullModule.forRootAsync({
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        connection: redisService.ensureClient(),
      }),
    }),
    BullModule.registerQueue(
      ...queues.map((queue) => ({
        name: queue.name,
        defaultJobOptions: {
          ...DEFAULT_JOB_OPTIONS,
          attempts: queue.attempts,
        },
      })),
    ),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: FastifyAdapter,
    }),
    BullBoardModule.forFeature(
      ...queues.map((queue) => ({
        name: queue.name,
        adapter: BullMQAdapter,
      })),
    ),
  ],
  providers: [
    QueueService,
    CrawlProcessor,
    GenerateTextProcessor,
    CreateProjectProcessor,
    PersistFileProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
