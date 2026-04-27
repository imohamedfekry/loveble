import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE_DB } from 'src/common/database/database.constants';
import type { DrizzleDatabase } from 'src/common/database/database.constants';

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
      const [user] = await db.insert(tempUsers).values(data).returning();

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

  async findById(id: bigint): Promise<TempUser | null> {
    return this.execute(async (db) => {
      const result = await db.select().from(tempUsers).where(eq(tempUsers.id, id)).limit(1);
      return result[0] ?? null;
    });
  }

  async deleteById(id: bigint): Promise<void> {
    await this.execute(async (db) => {
      await db.delete(tempUsers).where(eq(tempUsers.id, id));
    });
  }
  async updateOtpByEmail(
    email: string,
    data: { otpHash: string; otpExpiry: Date },
  ): Promise<TempUser | null> {
    return this.execute(async (db) => {
      const [updated] = await db
        .update(tempUsers)
        .set({
          otpHash: data.otpHash,
          otpExpiry: data.otpExpiry,
          updatedAt: new Date(),
        })
        .where(eq(tempUsers.email, email))
        .returning();

      return updated ?? null;
    });
  }
}
