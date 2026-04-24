import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DRIZZLE_DB, type DrizzleDatabase } from './database.constants';

type PgClientWithEnd = { end: () => Promise<void> };

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase) {}

  async onModuleInit() {
    await this.ping();
    this.logger.log('Database health check passed');
  }

  getDb(): DrizzleDatabase {
    return this.db;
  }

  async ping(): Promise<boolean> {
    await this.db.execute('SELECT 1');
    return true;
  }

  async onModuleDestroy() {
    const maybeClient = (this.db as unknown as { $client?: unknown }).$client;

    if (this.hasEnd(maybeClient)) {
      await maybeClient.end();
      this.logger.log('Database connection closed');
    }
  }

  private hasEnd(client: unknown): client is PgClientWithEnd {
    return (
      typeof client === 'object' &&
      client !== null &&
      'end' in client &&
      typeof (client as { end: unknown }).end === 'function'
    );
  }
}
