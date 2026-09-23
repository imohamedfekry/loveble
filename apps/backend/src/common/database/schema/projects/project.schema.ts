import {
  pgEnum,
  pgTable,
  bigint,
  timestamp,
  index,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { nextSnowflakeId } from 'src/common/utils/snowflake';
import { users } from '../user';
export const exportStatusEnum = pgEnum('export_status_enum', [
  'exporting',
  'completed',
  'failed',
]);

export const importStatusEnum = pgEnum('import_status_enum', [
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
    importStatus: importStatusEnum('import_status'),
    exportStatus: exportStatusEnum('export_status'),
    exportRepoUrl: varchar('export_repo_url', { length: 255 }),
    storageUsed: bigint('storage_used', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('projects_user_id_idx').on(table.userId)],
);
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
