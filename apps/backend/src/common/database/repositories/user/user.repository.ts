import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';


import { NewUser, User, users } from '../../schema';
import { BaseRepository } from '../base.repository';
import { DRIZZLE_DB } from '../../database.constants';
import type { DrizzleDatabase } from '../../database.constants';

@Injectable()
export class UserRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) db: DrizzleDatabase) {
    super(db);
  }
  async create(data: NewUser): Promise<User> {
    const [user] = await this.db.insert(users).values(data).returning();

    return user;
  }

  async findById(id: bigint): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] ?? null;
  }
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] ?? null;
  }
  async deleteById(id: bigint): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async updateById(id: bigint, data: Partial<NewUser>): Promise<User | null> {
    const [user] = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();

    return user ?? null;
  }
}
