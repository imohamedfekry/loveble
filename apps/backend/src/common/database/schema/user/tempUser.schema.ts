import { pgTable, bigint, varchar, timestamp } from 'drizzle-orm/pg-core';
import { nextSnowflakeId } from 'src/common/utils/snowflake';

export const tempUsers = pgTable('temp_users', {
  id: bigint('id', { mode: 'bigint' })
    .primaryKey()
    .$defaultFn(() => nextSnowflakeId()),
  email: varchar('email', { length: 255 }).notNull().unique(),
  otpHash: varchar('otp_hash', { length: 255 }).notNull(),
  otpExpiry: timestamp('otp_expiry').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type TempUser = typeof tempUsers.$inferSelect;
export type NewTempUser = typeof tempUsers.$inferInsert;
