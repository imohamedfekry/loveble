import { log } from 'console';
import type { DrizzleDatabase } from 'src/common/database/database.module';

export abstract class BaseRepository {
  constructor(protected readonly db: DrizzleDatabase) {}

  protected async execute<T>(cb: (db: DrizzleDatabase) => Promise<T>): Promise<T> {
    try {
      return await cb(this.db);
    } catch (error) {
        log('Database operation failed:', error);
      throw error;
    }
  }
}