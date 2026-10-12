import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { teamRunEvents } from '../team/team-events';
import type { TeamRunOutput } from '../workflows/team-run.workflow';

/** One tool call a specialist made in the run, echoed back to the supervisor. */
const toolCallSchema = z.object({
  name: z.string(),
  target: z.string().optional(),
});

/**
 * Lets the supervisor hand a well-scoped task to the whole team in one call.
 * The tool drives the `team-run` workflow (design ∥ review, then builder) and
 * returns each specialist's summary so the supervisor can relay results in the
 * chat stream without re-running anything.
 */
export const runTeamWorkflowTool = createTool({
  id: 'run-team-workflow',
  description: `Run the Loveble agent team (design, review, builder) over the current project.

Call this once when a task needs several specialists working together — it
executes them in parallel on the shared project workspace and returns their
summaries. Do NOT call it for a single small edit or a read-only question;
handle those yourself. Give it the complete, self-contained task description,
not a vague instruction, because the team does not see this conversation.`,
  inputSchema: z.object({
    request: z
      .string()
      .min(1)
      .describe(
        'The full task to hand to the team: what to build or change and any constraints.',
      ),
  }),
  outputSchema: z.object({
    summary: z.string(),
    design: z.string(),
    review: z.string(),
    runId: z.string(),
    designTools: z.array(toolCallSchema),
    reviewTools: z.array(toolCallSchema),
    builderTools: z.array(toolCallSchema),
  }),
  execute: async ({ request }, context) => {
    const mastra = context?.mastra;
    if (!mastra) {
      throw new Error('Team run unavailable: no Mastra instance');
    }

    const projectId = context?.requestContext?.get('projectId');
    const scope = typeof projectId === 'string' ? { projectId } : {};

    const run = await mastra.getWorkflow('team-run').createRun();
    const startedAt = Date.now();
    teamRunEvents.emit({
      runId: run.runId,
      phase: 'prepare',
      status: 'start',
      detail: 'team run requested',
      ...scope,
    });

    const result = await run.start({
      inputData: { request },
      ...(context?.requestContext
        ? { requestContext: context.requestContext }
        : {}),
    });

    if (result.status !== 'success') {
      const message =
        result.status === 'failed'
          ? result.error.message
          : `team run ended with status ${result.status}`;
      teamRunEvents.emit({
        runId: run.runId,
        phase: 'done',
        status: 'error',
        detail: message,
        ...scope,
      });
      throw new Error(`Team run failed: ${message}`);
    }

    const output = result.result as TeamRunOutput;
    teamRunEvents.emit({
      runId: run.runId,
      phase: 'done',
      status: 'done',
      detail: `team run finished in ${Date.now() - startedAt}ms`,
      ...scope,
    });
    console.log(`[team-run] finished in ${Date.now() - startedAt}ms`);
    return {
      summary: output.summary,
      design: output.design.summary,
      review: output.review.summary,
      runId: run.runId,
      designTools: output.design.tools,
      reviewTools: output.review.tools,
      builderTools: output.builderTools,
    };
  },
});
