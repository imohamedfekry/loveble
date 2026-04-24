import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private enabled = false;
  private hadReconnectAttempt = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.enabled = this.configService.get<boolean>('redis.enabled') ?? false;

    if (!this.enabled) {
      this.logger.log('Redis is disabled (REDIS_ENABLED=false)');
      return;
    }

    this.client = this.createClient();
    this.registerEventHandlers(this.client);

    try {
      await this.client.ping();
      this.logger.log('Redis connected successfully');
    } catch (error) {
      const message = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to connect to Redis', message);
      throw error;
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  async ping(): Promise<boolean> {
    if (!this.enabled || !this.client) {
      return true;
    }

    return (await this.client.ping()) === 'PONG';
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  private createClient(): Redis {
    const redisUrl = this.configService.get<string>('redis.url');

    if (redisUrl) {
      return new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: false,
        enableReadyCheck: true,
      });
    }

    return new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      username: this.configService.get<string>('redis.username'),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db'),
      maxRetriesPerRequest: 1,
      lazyConnect: false,
      enableReadyCheck: true,
    });
  }

  private registerEventHandlers(client: Redis): void {
    client.on('ready', () => {
      if (this.hadReconnectAttempt) {
        this.logger.log('Redis reconnected successfully');
        this.hadReconnectAttempt = false;
        return;
      }

      this.logger.log('Redis connection is ready');
    });

    client.on('error', (error) => {
      const message = error instanceof Error ? error.stack : String(error);
      this.logger.error('Redis runtime error', message);
    });

    client.on('reconnecting', () => {
      this.hadReconnectAttempt = true;
      this.logger.warn('Redis reconnecting...');
    });
  }
}
