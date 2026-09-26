import { relations } from 'drizzle-orm';
import { users } from '../user/user.schema';
import { projects } from './project.schema';
import { conversations } from '../conversations/conversation.schema';
import { files } from './file.schema';

export const projectsRelations = relations(projects, ({ many, one }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  files: many(files),
  conversations: many(conversations),
}));
