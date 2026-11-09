import {
  pgTable,
  bigint,
  timestamp,
  index,
  varchar,
  jsonb,
} from 'drizzle-orm/pg-core';
import { nextSnowflakeId } from 'src/common/utils/snowflake';
import { projects } from '../projects/project.schema';

/**
 * The plan the agent is currently working through in one conversation.
 * Written only by the `update-plan` tool (server-side); the client never sends
 * it, so it cannot be spoofed or drift from what the agent actually did.
 */
export type ConversationPlanStep = {
  title: string;
  status: 'pending' | 'active' | 'done' | 'blocked';
};

export type ConversationPlan = {
  title: string | null;
  steps: ConversationPlanStep[];
  updatedAt: string;
};

export const conversations = pgTable(
  'conversations',
  {
    id: bigint('id', { mode: 'bigint' })
      .primaryKey()
      .$defaultFn(() => nextSnowflakeId()),
    projectId: bigint('project_id', { mode: 'bigint' })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }),
    plan: jsonb('plan').$type<ConversationPlan | null>(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('conversations_project_id_idx').on(table.projectId)],
);
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
