import * as v from 'valibot';

const titleField = v.pipe(
  v.string('Title must be a string'),
  v.nonEmpty('Title is required'),
  v.maxLength(255, 'Title cannot exceed 255 characters'),
);

export const CreateConversationSchema = v.object({
  projectId: v.pipe(
    v.string('Project ID must be a string'),
    v.nonEmpty('Project ID is required'),
    v.regex(/^\d{16,19}$/, 'Invalid project ID'),
  ),
  title: titleField,
});

export const UpdateConversationSchema = v.object({
  title: v.optional(titleField),
});

export const CreateMessageSchema = v.object({
  conversationId: v.pipe(
    v.string('Conversation ID must be a string'),
    v.nonEmpty('Conversation ID is required'),
    v.regex(/^\d{16,19}$/, 'Invalid conversation ID'),
  ),
  content: v.pipe(
    v.string('Content must be a string'),
    v.nonEmpty('Content is required'),
  ),
  role: v.picklist(['user', 'assistant', 'system'], 'Invalid role'),
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

export type CreateConversationDto = v.InferOutput<
  typeof CreateConversationSchema
>;
export type UpdateConversationDto = v.InferOutput<
  typeof UpdateConversationSchema
>;
export type CreateMessageDto = v.InferOutput<typeof CreateMessageSchema>;
export type UpdateMessageDto = v.InferOutput<typeof UpdateMessageSchema>;
