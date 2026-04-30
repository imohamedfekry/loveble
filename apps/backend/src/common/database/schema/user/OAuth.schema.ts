import {
  pgTable,
  bigint,
  varchar,
  timestamp,
  text,
  index,
} from 'drizzle-orm/pg-core';

import { nextSnowflakeId } from 'src/common/utils/snowflake';
import { users } from './user.schema';
import { relations } from 'drizzle-orm/relations';

export const userOAuthAccounts = pgTable(
  'user_oauth_accounts',
  {
    id: bigint('id', { mode: 'bigint' })
      .primaryKey()
      .$defaultFn(() => nextSnowflakeId()),
    avatar_url: text('avatar'),
    userId: bigint('user_id', { mode: 'bigint' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    provider: varchar('provider', { length: 20 }).notNull(),
    providerId: varchar('provider_id', { length: 255 }).notNull(),

    accessToken: text('access_token').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('user_oauth_user_id_idx').on(table.userId)],
);
export const usersRelations = relations(users, ({ many }) => ({
  oauthAccounts: many(userOAuthAccounts),
}));
export const userOAuthAccountsRelations = relations(
  userOAuthAccounts,
  ({ one }) => ({
    user: one(users, {
      fields: [userOAuthAccounts.userId],
      references: [users.id],
    }),
  }),
);