import {
    pgTable,
    bigint,
    timestamp,
    index,
    varchar,
} from 'drizzle-orm/pg-core';
import { nextSnowflakeId } from 'src/common/utils/snowflake';
import { projects } from '../projects/project.schema';

export const conversations = pgTable(
    'conversations',
    {
        id: bigint('id', { mode: 'bigint' }).primaryKey().$defaultFn(() => nextSnowflakeId()),
        projectId: bigint('project_id', { mode: 'bigint' }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
        title: varchar('title', { length: 255 }).notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => [index('conversations_project_id_idx').on(table.projectId)],
);
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
