import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/common/database/database.service';
import { RedisService } from 'src/common/redis/redis.service';
import { crawl } from 'src/common/scraping/crawl.service';

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
    // throw new Error("Sentry test error");
    const dbHealthy = await this.databaseService.ping();
    const redisHealthy = await this.redisService.ping();
    // add checks for external services like SearxNG and Crawl4AI if needed
    // const searxng = await this.checkSearxng();
    const crawl4ai = await crawl(['https://example.com']);
    return {
      status: dbHealthy && redisHealthy && crawl4ai ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('app.nodeEnv'),
      services: {
        database: dbHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
        // searxng: searxng ? 'up' : 'down',
        crawl4ai: crawl4ai ? 'up' : 'down',
      },
    };
  }
}
