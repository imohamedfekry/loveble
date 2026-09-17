import {
  pgTable,
  bigint,
  timestamp,
  index,
  varchar,
  pgEnum,
  integer,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { nextSnowflakeId } from 'src/common/utils/snowflake';
import { projects } from './project.schema';
import { sql } from 'drizzle-orm';

export const fileTypeEnum = pgEnum('file_type_enum', ['file', 'folder']);

export const files = pgTable(
  'files',
  {
    id: bigint('id', { mode: 'bigint' })
      .primaryKey()
      .$defaultFn(() => nextSnowflakeId()),

    projectId: bigint('project_id', {
      mode: 'bigint',
    })
      .notNull()
      .references(() => projects.id, {
        onDelete: 'cascade',
      }),

    parentId: bigint('parent_id', {
      mode: 'bigint',
    }).references((): any => files.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    type: fileTypeEnum('type').notNull(),
    storageKey: uuid('storage_key').default(sql`gen_random_uuid()`),
    version: integer('version').default(1).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('files_project_id_idx').on(table.projectId),

    index('files_parent_id_idx').on(table.parentId),

    index('files_project_parent_idx').on(table.projectId, table.parentId),

    index('files_project_parent_type_idx').on(
      table.projectId,
      table.parentId,
      table.type,
    ),

    unique('files_unique_name_per_folder_idx')
      .on(table.projectId, table.parentId, table.name)
      .nullsNotDistinct(),
  ],
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
