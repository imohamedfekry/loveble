import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Turn-based clarification. This stack (Mastra 1.75 + @mastra/ai-sdk 1.10) has
 * no workflow/agent `suspend`/`resume`, so a run cannot be paused mid-stream and
 * resumed. Instead the agent surfaces a question with concrete options while it
 * still has the turn; the frontend renders the options as buttons and the
 * user's choice (or a custom answer) arrives as the next user message.
 */
export const askUserTool = createTool({
  id: 'ask-user',
  description: `Ask the user to decide when the request is genuinely ambiguous and you cannot pick a sensible default yourself. Give a short question and 2-4 concrete options.

Call this tool, then STOP: end your turn right after it (one short lead-in line at most). The user's answer arrives as their next message, so do NOT continue working or assume an answer. Never call it for something you can reasonably decide on your own — only when the choice materially changes the outcome.`,
  inputSchema: z.object({
    question: z
      .string()
      .min(1)
      .describe('The decision to make, phrased as a short question.'),
    options: z
      .array(z.string().min(1))
      .min(2)
      .max(4)
      .describe('Two to four concrete, mutually exclusive choices.'),
    allowCustom: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether the user may type their own answer instead.'),
  }),
  outputSchema: z.object({
    presented: z.literal(true),
    note: z.string(),
  }),
  execute: () =>
    Promise.resolve({
      presented: true as const,
      note: 'Question shown to the user. Stop here and wait for their reply.',
    }),
});
