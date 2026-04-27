import {
  pgTable,
  bigint,
  varchar,
  timestamp,
  text,
  unique,
} from 'drizzle-orm/pg-core';

import { nextSnowflakeId } from 'src/common/utils/snowflake';
import { users } from './user.schema';

export const userOAuthAccounts = pgTable(
  'user_oauth_accounts',
  {
    id: bigint('id', { mode: 'bigint' })
      .primaryKey()
      .$defaultFn(() => nextSnowflakeId()),

    userId: bigint('user_id', { mode: 'bigint' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    provider: varchar('provider', { length: 20 }).notNull(),
    providerId: varchar('provider_id', { length: 255 }).notNull(),

    accessToken: text('access_token').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userOAuthUnique: unique('user_oauth_unique').on(
      table.provider,
      table.providerId,
    ),
  }),
);