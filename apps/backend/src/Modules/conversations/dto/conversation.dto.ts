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
export type UpdateMessageDto = v.InferOutput<typeof UpdateMessageSchema>;
