import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { getNestApp } from 'src/common/inngest/nest-context';
import { ConversationRepository } from 'src/common/database/repositories/conversations/conversation.repository';
import type { ConversationPlan } from 'src/common/database/schema/conversations/conversation.schema';

/**
 * The plan is server-side conversation state, not a chat message.
 *
 * Each call replaces the plan stored on the conversation row, and the frontend
 * renders that row above the composer. Because the write happens here — inside
 * the agent's tool call, scoped by the request's conversationId — the browser
 * can never write a plan (there is no client endpoint for it) and a reload shows
 * exactly what the agent last published.
 */
export const planTool = createTool({
  id: 'update-plan',
  description: `Publish the task plan the user sees pinned above the chat composer.

Call it BEFORE you start multi-step work, and again every time a step changes state. Always pass the COMPLETE list of steps — a call replaces the previous plan, it does not append. Mark the step you are working on as "active", flip it to "done" as soon as it is finished and verified, and use "blocked" only when you truly cannot continue without the user.

Use it for tasks that touch more than one file, need installs, or will take several tool calls. Skip it for a single trivial edit or a plain answer.`,
  inputSchema: z.object({
    title: z
      .string()
      .min(1)
      .optional()
      .describe('Optional one-line goal shown as the plan heading.'),
    steps: z
      .array(
        z.object({
          title: z
            .string()
            .min(1)
            .describe('One short, concrete step (a few words, no numbering).'),
          status: z
            .enum(['pending', 'active', 'done', 'blocked'])
            .describe(
              'pending = not started, active = the step you are on now, done = finished and verified, blocked = waiting on the user.',
            ),
        }),
      )
      .min(1)
      .max(10)
      .describe('The full, ordered list of steps.'),
  }),
  outputSchema: z.object({
    updated: z.literal(true),
    total: z.number(),
    done: z.number(),
    note: z.string(),
  }),
  execute: async ({ title, steps }, context) => {
    const done = steps.filter((step) => step.status === 'done').length;
    const rawConversationId = context?.requestContext?.get('conversationId');
    const rawProjectId = context?.requestContext?.get('projectId');
    // Both arrive as strings from the controller; anything else is not a usable
    // scope and must not be stringified blindly.
    const projectId =
      typeof rawProjectId === 'string' || typeof rawProjectId === 'number'
        ? String(rawProjectId)
        : null;

    const plan: ConversationPlan = {
      title: title?.trim() || null,
      steps,
      updatedAt: new Date().toISOString(),
    };

    // Persisting is best-effort: a missing context (e.g. quick-edit runs with a
    // synthetic conversation id) must not turn a plan update into a tool error,
    // the agent still needs the acknowledgement to keep working.
    let stored = false;
    if (
      typeof rawConversationId === 'string' ||
      typeof rawConversationId === 'number'
    ) {
      try {
        const repository = getNestApp().get(ConversationRepository);
        const conversationId = BigInt(String(rawConversationId));
        const conversation = await repository.findById(conversationId);
        const projectMatches =
          !projectId ||
          (conversation && String(conversation.projectId) === projectId);
        if (conversation && projectMatches) {
          await repository.setPlan(conversationId, plan);
          stored = true;
        }
      } catch (error) {
        console.warn('[update-plan] failed to store plan:', error);
      }
    }

    return {
      updated: true as const,
      total: steps.length,
      done,
      note: stored
        ? 'Plan saved and shown to the user above the composer. Keep going with the active step and call update-plan again when a step finishes.'
        : 'Plan accepted but not saved (no conversation in context). It will not be visible to the user — report the plan in your final answer.',
    };
  },
});
