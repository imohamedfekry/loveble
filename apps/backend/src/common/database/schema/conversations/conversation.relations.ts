import { relations } from 'drizzle-orm';
import { conversations } from './conversation.schema';
import { projects } from '../projects/project.schema';
import { messages } from './message.schema';

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [conversations.projectId],
      references: [projects.id],
    }),
    messages: many(messages),
  }),
);
