import { pgTable, bigint, varchar, timestamp } from 'drizzle-orm/pg-core'
import { nextSnowflakeId } from 'src/common/utils/snowflake'

export const users = pgTable('users', {
  id:        bigint('id', { mode: 'bigint' }).primaryKey().$defaultFn(() => nextSnowflakeId()),
  username:  varchar('username', { length: 50 }).notNull().unique(),
  email:     varchar('email', { length: 255 }).notNull().unique(),
  password:  varchar('password', { length: 255 }).notNull(),
  mobile:    varchar('mobile', { length: 20 }),
  country:   varchar('country', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type User    = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert