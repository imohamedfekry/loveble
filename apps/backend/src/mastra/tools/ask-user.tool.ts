import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const questionSchema = z.object({
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
});

/**
 * Turn-based clarification. This stack (Mastra 1.75 + @mastra/ai-sdk 1.10) has
 * no workflow/agent `suspend`/`resume`, so a run cannot be paused mid-stream and
 * resumed. Instead the agent surfaces one to three questions with concrete
 * options while it still has the turn; the frontend renders them as a single
 * card and the user's answers arrive as their next message.
 *
 * The schema takes exactly one shape — `questions` with one to three entries —
 * because an all-optional schema let models emit `{}`: the tool "succeeded",
 * nothing was rendered, and the agent carried on as if it had asked. Older
 * stored turns with the single-question shape still render (the frontend reads
 * them), they are just no longer a shape the model can send.
 */
export const askUserTool = createTool({
  id: 'ask-user',
  description: `Ask the user to decide before you build the wrong thing. Batch every open decision into ONE call (up to 3 questions) instead of guessing or asking one at a time.

Ask when the answer changes what you build and you cannot pick a sensible default: the design direction or palette, which pages/sections matter, new vs. replaced content, a dependency the user must pay for, credentials/env vars you need, or any "either of these two" choice. Give each question a short, plain sentence and 2-4 concrete, mutually exclusive options. Do not ask about things you can read from the project, and do not ask to confirm a request you already understand.

Call this tool, then STOP: end your turn right after it (one short lead-in line at most). The user's answers arrive as their next message, so do NOT continue working or assume an answer.`,
  inputSchema: z.object({
    questions: z
      .array(questionSchema)
      .min(1)
      .max(3)
      .describe('One to three questions to ask together.'),
  }),
  outputSchema: z.object({
    presented: z.literal(true),
    asked: z.number(),
    note: z.string(),
  }),
  // Mastra types `execute` as returning a Promise and there is genuinely
  // nothing to wait for: the card is rendered from the streamed tool input.
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ questions }) => ({
    presented: true as const,
    asked: questions.length,
    note: 'Question card shown to the user. Stop here and wait for their reply — do not continue working or assume an answer.',
  }),
});
