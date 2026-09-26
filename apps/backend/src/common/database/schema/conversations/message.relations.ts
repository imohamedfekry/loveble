import { relations } from 'drizzle-orm';
import { messages } from './message.schema';
import { conversations } from './conversation.schema';
import { projects } from '../projects/project.schema';

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  project: one(projects, {
    fields: [messages.projectId],
    references: [projects.id],
  }),
}));
