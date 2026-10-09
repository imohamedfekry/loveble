import * as v from 'valibot';
import type { UIMessage } from 'ai';

const UIMessageSchema = v.looseObject({
  id: v.optional(v.string()),
  role: v.picklist(['user', 'assistant', 'system'], 'Invalid message role'),
  parts: v.optional(v.array(v.any())),
});

export const ChatRequestSchema = v.object({
  messages: v.pipe(
    v.array(UIMessageSchema),
    v.minLength(1, 'messages must not be empty'),
  ),
  mode: v.optional(v.picklist(['plan', 'build']), 'build'),
  conversationId: v.optional(v.pipe(v.string(), v.regex(/^\d{16,19}$/))),
  trigger: v.optional(v.picklist(['submit-message', 'regenerate-message'])),
});

export type ChatRequestDto = Omit<
  v.InferOutput<typeof ChatRequestSchema>,
  'messages'
> & {
  messages: UIMessage[];
};
