import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { DRIZZLE_DB } from './database.module';
import type { DrizzleDatabase } from './database.module';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase,
  ) {}

  async onModuleDestroy() {
    const client: any = (this.db as any).$client;

    if (client?.end) {
      await client.end();
      console.log('🛑 Database connection closed');
    }
  }
}