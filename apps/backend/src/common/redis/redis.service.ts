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
  private hadReconnectAttempt = false;
  private connectionErrorLogged = false;

  constructor(private readonly configService: ConfigService) { }

  async onModuleInit(): Promise<void> {
    this.client = this.createClient();
    this.registerEventHandlers(this.client);

    this.logger.log('Redis initialization started...');

    // Attempt an initial ping but don't block startup or crash if it fails
    this.client.ping()
      .then(() => {
        this.logger.log('Redis connected successfully');
        this.connectionErrorLogged = false;
      })
      .catch((error) => {
        if (!this.connectionErrorLogged) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Redis connection failed initially: ${message}. The app will continue starting but Redis features will be unavailable.`);
          this.connectionErrorLogged = true;
        }
      });
  }

  getClient(): Redis | null {
    return this.client;
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  private createClient(): Redis {
    const redisUrl = this.configService.get<string>('redis.url');
    const commonOptions = {
      maxRetriesPerRequest: null, // Required by BullMQ to prevent MaxRetriesPerRequestError
      lazyConnect: true,
      enableReadyCheck: false,
      retryStrategy: (times: number) => {
        // Exponential backoff with a cap, and less verbose logging
        const delay = Math.min(times * 1000, 10000);
        return delay;
      },
    };

    if (redisUrl) {
      return new Redis(redisUrl, commonOptions);
    }

    return new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      username: this.configService.get<string>('redis.username'),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db'),
      ...commonOptions,
    });
  }

  private registerEventHandlers(client: Redis): void {
    client.on('ready', () => {
      if (this.hadReconnectAttempt || this.connectionErrorLogged) {
        this.logger.log('Redis reconnected successfully');
        this.hadReconnectAttempt = false;
        this.connectionErrorLogged = false;
        return;
      }
      this.logger.log('Redis connection is ready');
    });

    client.on('error', (error) => {
      // Only log the first connection error to avoid spamming
      if (!this.connectionErrorLogged) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Redis error: ${message}`);
        this.connectionErrorLogged = true;
      }
    });

    client.on('reconnecting', () => {
      if (!this.hadReconnectAttempt && !this.connectionErrorLogged) {
        this.logger.warn('Redis reconnecting...');
        this.hadReconnectAttempt = true;
      }
    });
  }
}
