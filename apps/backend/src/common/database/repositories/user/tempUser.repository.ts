import { Injectable, Inject } from '@nestjs/common';
import { eq, lt } from 'drizzle-orm';

import { DRIZZLE_DB } from 'src/common/database/database.module';
import type { DrizzleDatabase } from 'src/common/database/database.module';

import { BaseRepository } from '../base.repository';
import { tempUsers, TempUser, NewTempUser } from '../../schema';

@Injectable()
export class TempUserRepository extends BaseRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    db: DrizzleDatabase,
  ) {
    super(db);
  }
  async create(data: NewTempUser): Promise<TempUser> {
    return this.execute(async (db) => {
      const [user] = await db
        .insert(tempUsers)
        .values(data)
        .returning();

      return user;
    });
  }
  async findByEmail(email: string): Promise<TempUser | null> {
    return this.execute(async (db) => {
      const result = await db
        .select()
        .from(tempUsers)
        .where(eq(tempUsers.email, email))
        .limit(1);
      return result[0] ?? null;
    });
  }
}