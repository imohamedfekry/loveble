import * as v from 'valibot';

export const QuickEditRequestSchema = v.object({
  selectedCode: v.pipe(v.string(), v.nonEmpty('Selected code is required')),
  fullCode: v.pipe(v.string(), v.nonEmpty('Full code is required')),
  instruction: v.pipe(v.string(), v.nonEmpty('Instruction is required')),
});

export const QuickEditResponseSchema = v.object({
  editedCode: v.pipe(v.string(), v.nonEmpty('Edited code is required')),
});

export type QuickEditRequestDto = v.InferOutput<typeof QuickEditRequestSchema>;
export type QuickEditResponseDto = v.InferOutput<typeof QuickEditResponseSchema>;
