import { pgTable, bigint, timestamp, index, varchar, pgEnum, integer } from 'drizzle-orm/pg-core';
import { nextSnowflakeId } from 'src/common/utils/snowflake';
import { projects } from './project.schema';
export const fileTypeEnum = pgEnum('file_type_enum', ['file', 'folder']);

export const files = pgTable('files',{
        id: bigint('id', { mode: 'bigint' }).primaryKey().$defaultFn(() => nextSnowflakeId()),
        projectId: bigint('project_id', { mode: 'bigint' }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
        parentId: bigint('parent_id', { mode: 'bigint' }).references((): any => files.id, { onDelete: 'cascade' },),
        name: varchar('name', { length: 255 }).notNull(),
        type: fileTypeEnum('type',).notNull(),
        storageKey: varchar('storage_key', { length: 506 }),
        mimeType: varchar('mime_type', { length: 10 }),
        size: bigint('size', { mode: 'number' }),
        version: integer('version').default(1).notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => [
        index('files_project_id_idx').on(table.projectId),
        index('files_parent_id_idx').on(table.parentId),
        index('files_project_parent_idx').on(table.projectId,table.parentId,),
    ]
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;;