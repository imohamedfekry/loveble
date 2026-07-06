import { relations } from 'drizzle-orm';

import { files } from './file.schema';
import { projects } from './project.schema';

export const filesRelations = relations(
  files,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [files.projectId],
      references: [projects.id],
    }),

    parent: one(files, {
      fields: [files.parentId],
      references: [files.id],
      relationName: 'parent',
    }),

    children: many(files, {
      relationName: 'parent',
    }),
  }),
);