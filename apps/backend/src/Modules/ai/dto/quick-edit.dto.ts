import * as v from 'valibot';

export const QuickEditRequestSchema = v.object({
  projectId: v.pipe(v.string(), v.nonEmpty('Project id is required')),
  fileId: v.pipe(v.string(), v.nonEmpty('File id is required')),
  instruction: v.pipe(v.string(), v.nonEmpty('Instruction is required')),
  startLine: v.optional(v.number()),
  endLine: v.optional(v.number()),
});

export const QuickEditResponseSchema = v.object({
  ok: v.boolean(),
  path: v.optional(v.string()),
});

export type QuickEditRequestDto = v.InferOutput<typeof QuickEditRequestSchema>;
export type QuickEditResponseDto = v.InferOutput<
  typeof QuickEditResponseSchema
>;
