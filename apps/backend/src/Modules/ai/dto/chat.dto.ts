import * as v from 'valibot';

export const ChatRequestSchema = v.object({
  message: v.pipe(
    v.string('message must be a string'),
    v.trim(),
    v.minLength(1, 'message must not be empty'),
  ),
  mode: v.optional(v.picklist(['plan', 'build']), 'build'),
  conversationId: v.optional(v.pipe(v.string(), v.regex(/^\d{16,19}$/))),
  trigger: v.optional(v.picklist(['submit-message', 'regenerate-message'])),
});

export type ChatRequestDto = v.InferOutput<typeof ChatRequestSchema>;
