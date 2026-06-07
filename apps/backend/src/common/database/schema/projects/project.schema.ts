import { pgEnum, pgTable, bigint, timestamp, index, varchar } from 'drizzle-orm/pg-core';
import { nextSnowflakeId } from 'src/common/utils/snowflake';
import { users } from '../user';
const importStatusEnum = pgEnum('import_status_enum', [
  'importing',
  'completed',
  'failed',
]);

export const projects = pgTable(
  'projects',
  {
    id: bigint('id', { mode: 'bigint' })
      .primaryKey()
      .$defaultFn(() => nextSnowflakeId()),
    userId: bigint('user_id', { mode: 'bigint' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    importStatus: importStatusEnum('import_status').notNull().default('importing'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (table) => [index('projects_user_id_idx').on(table.userId)],
);
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
