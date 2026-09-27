import {
    pgTable,
    bigint,
    timestamp,
    index,
    text,
    pgEnum,
} from 'drizzle-orm/pg-core';
import { nextSnowflakeId } from 'src/common/utils/snowflake';
import { projects } from '../projects/project.schema';
import { conversations } from './conversation.schema';

export const messageStatusEnum = pgEnum('message_status_enum', [
    'processing',
    'completed',
    'canceled',
]);

export const roleEnum = pgEnum('role_enum', ['user', 'assistant', 'system']);
export const messages = pgTable(
    'messages',
    {
        id: bigint('id', { mode: 'bigint' }).primaryKey().$defaultFn(() => nextSnowflakeId()),
        projectId: bigint('project_id', { mode: 'bigint' }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
        conversationId: bigint('conversation_id', { mode: 'bigint' }).notNull().references(() => conversations.id, { onDelete: 'cascade' }),
        content: text('content').notNull(),
        status: messageStatusEnum('message_status'),
        role: roleEnum('role').notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => [index('messages_project_id_idx').on(table.projectId), index('messages_conversation_id_idx').on(table.conversationId)],
);
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
