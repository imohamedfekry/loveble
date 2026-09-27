import * as v from 'valibot';

enum ImportStatus {
  importing = 'importing',
  completed = 'completed',
  failed = 'failed',
}

const promptField = v.pipe(
  v.string('Prompt must be a string'),
  v.minLength(10, 'Describe your app a bit more (at least 10 characters)'),
  v.maxLength(2000, 'Prompt cannot exceed 2000 characters'),
);

const nameField = v.pipe(
  v.string('Name must be a string'),
  v.nonEmpty('Name is required'),
  v.maxLength(100, 'Name cannot exceed 100 characters'),
);

export const ProjectSchema = v.pipe(
  v.object({
    prompt: v.optional(promptField),
    name: v.optional(nameField),
  }),
  v.check(
    (input) => Boolean(input.prompt || input.name),
    'Either prompt or name is required',
  ),
);

export const UpdateProjectSchema = v.object({
  name: v.optional(
    v.pipe(
      v.string('Name must be a string'),
      v.nonEmpty('Name is required'),
      v.maxLength(100, 'Name cannot exceed 100 characters'),
    ),
  ),
  importStatus: v.pipe(
    v.optional(
      v.enum(
        ImportStatus,
        `Expected one of: ${Object.values(ImportStatus).join(', ')}`,
      ),
    ),
  ),
});

export const ProjectQuerySchema = v.object({
  recent: v.optional(v.union([v.literal('true'), v.literal('false')])),
  page: v.optional(v.string()),
  limit: v.optional(v.string()),
});

export const GeneratedNameWebhookSchema = v.object({
  projectId: v.pipe(
    v.string('Project ID must be a string'),
    v.nonEmpty('Project ID is required'),
  ),
  name: v.pipe(
    v.string('Name must be a string'),
    v.nonEmpty('Name is required'),
    v.maxLength(100, 'Name cannot exceed 100 characters'),
  ),
});

export type ProjectDto = v.InferOutput<typeof ProjectSchema>;
export type UpdateProjectDto = v.InferOutput<typeof UpdateProjectSchema>;
export type ProjectQueryDto = v.InferOutput<typeof ProjectQuerySchema>;
export type GeneratedNameWebhookDto = v.InferOutput<
  typeof GeneratedNameWebhookSchema
>;
