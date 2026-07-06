import { relations } from 'drizzle-orm';

import { projects } from './project.schema';
import { files } from './file.schema';

export const projectsRelations = relations(
  projects,
  ({ many }) => ({
    files: many(files),
  }),
);