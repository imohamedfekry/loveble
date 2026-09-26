import { relations } from 'drizzle-orm';
import { users } from './user.schema';
import { projects } from '../projects/project.schema';

export const userRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));
