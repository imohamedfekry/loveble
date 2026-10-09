import * as v from 'valibot';

export const AgentGenerateRequestSchema = v.object({
  prompt: v.pipe(v.string(), v.nonEmpty('Prompt is required')),
  model: v.optional(v.string()),
});

export const AgentGenerateResponseSchema = v.object({
  text: v.string(),
  model: v.string(),
});

export type AgentGenerateRequestDto = v.InferOutput<
  typeof AgentGenerateRequestSchema
>;
export type AgentGenerateResponseDto = v.InferOutput<
  typeof AgentGenerateResponseSchema
>;
