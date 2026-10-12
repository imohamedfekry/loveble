import * as v from 'valibot';

const titleField = v.pipe(
  v.string('Title must be a string'),
  v.nonEmpty('Title is required'),
  v.maxLength(255, 'Title cannot exceed 255 characters'),
);

export const UpdateConversationSchema = v.object({
  title: v.optional(titleField),
});

export const CreateMessageSchema = v.object({
  content: v.pipe(
    v.string('Content must be a string'),
    v.nonEmpty('Content is required'),
  ),
  parts: v.optional(v.array(v.any())),
});

// A completed assistant turn. Unlike a user message it may have no text when
// the model ended on a tool call (e.g. it hit its step cap) — as long as it
// carries parts, the produced artifacts/tool calls must still be persisted.
export const CreateAssistantMessageSchema = v.pipe(
  v.object({
    content: v.optional(v.string('Content must be a string')),
    parts: v.optional(v.array(v.any())),
  }),
  v.check(
    (value) =>
      (value.content?.trim().length ?? 0) > 0 || (value.parts?.length ?? 0) > 0,
    'Provide message content or parts',
  ),
);

// Sent when generation is stopped: the (optional) partial assistant text plus
// the system marker are persisted together in a single request.
export const StopMessageSchema = v.object({
  content: v.optional(v.string('Content must be a string')),
  parts: v.optional(v.array(v.any())),
});

export const UpdateMessageSchema = v.object({
  status: v.optional(
    v.picklist(['processing', 'completed', 'canceled'], 'Invalid status'),
  ),
  content: v.optional(
    v.pipe(
      v.string('Content must be a string'),
      v.nonEmpty('Content is required'),
    ),
  ),
});

export type UpdateConversationDto = v.InferOutput<
  typeof UpdateConversationSchema
>;
export type CreateMessageDto = v.InferOutput<typeof CreateMessageSchema>;
export type CreateAssistantMessageDto = v.InferOutput<
  typeof CreateAssistantMessageSchema
>;
export type StopMessageDto = v.InferOutput<typeof StopMessageSchema>;
export type UpdateMessageDto = v.InferOutput<typeof UpdateMessageSchema>;
