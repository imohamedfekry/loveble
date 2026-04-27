import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';

import { BaseRepository } from '../base.repository';
import { DRIZZLE_DB } from 'src/common/database/database.constants';
import type { DrizzleDatabase } from 'src/common/database/database.constants';
import { userOAuthAccounts } from '../../schema/user/OAuth.schema';
export type NewOAuthAccount = typeof userOAuthAccounts.$inferInsert;
export type OAuthAccount = typeof userOAuthAccounts.$inferSelect;

@Injectable()
export class OAuthRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) db: DrizzleDatabase) {
    super(db);
  }

  async findByProvider(
    provider: string,
    providerId: string,
  ): Promise<OAuthAccount | null> {
    const result = await this.db
      .select()
      .from(userOAuthAccounts)
      .where(
        and(
          eq(userOAuthAccounts.provider, provider),
          eq(userOAuthAccounts.providerId, providerId),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }
  
  async create(data: NewOAuthAccount): Promise<OAuthAccount> {
    const [account] = await this.db
      .insert(userOAuthAccounts)
      .values(data)
      .returning();

    return account;
  }

  async findByUserId(userId: bigint): Promise<OAuthAccount[]> {
    return this.db
      .select()
      .from(userOAuthAccounts)
      .where(eq(userOAuthAccounts.userId, userId));
  }
  async findByUserIdAndProvider(
    userId: bigint,
    provider: string,
  ): Promise<OAuthAccount | null> {
    const result = await this.db
      .select()
      .from(userOAuthAccounts)
      .where(
        and(
          eq(userOAuthAccounts.userId, userId),
          eq(userOAuthAccounts.provider, provider),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  async updateToken(
    provider: string,
    providerId: string,
    accessToken: string,
  ): Promise<OAuthAccount | null> {
    const [account] = await this.db
      .update(userOAuthAccounts)
      .set({
        accessToken,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userOAuthAccounts.provider, provider),
          eq(userOAuthAccounts.providerId, providerId),
        ),
      )
      .returning();

    return account ?? null;
  }
}
