import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GENERATION_QUEUE } from './queue.constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host') || '127.0.0.1',
          port: config.get<number>('redis.port') || 6379,
          password: config.get<string>('redis.password'),
          username: config.get<string>('redis.username'),
          db: config.get<number>('redis.db') || 0,
          maxRetriesPerRequest: null, // Critical: Must be null for BullMQ
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: GENERATION_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
