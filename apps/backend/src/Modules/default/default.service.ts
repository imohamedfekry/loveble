import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/common/database/database.service';
import { RedisService } from 'src/common/redis/redis.service';

@Injectable()
export class DefaultService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}
  status() {
    return {
      name: 'API Status',
      version: 'v1',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
  async getHealth() {
    const dbHealthy = await this.databaseService.ping();
    const redisHealthy = await this.redisService.ping();

    return {
      status: dbHealthy && redisHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('app.nodeEnv'),
      services: {
        database: dbHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
      },
    };
  }
}
