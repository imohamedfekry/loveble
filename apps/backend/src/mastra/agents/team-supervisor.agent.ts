import { Agent } from '@mastra/core/agent';
import { DEFAULT_AGENT_MODEL, getModel } from 'src/ai/providers';
import { generalAgentMemory } from 'src/common/inngest/agents/memory';
import { runTeamWorkflowTool } from '../tools/run-team-workflow.tool';
import { builderAgent } from './builder.agent';
import { designAgent } from './team/design.agent';
import { reviewAgent } from './team/review.agent';
import {
  AGENT_ROLE_KEY,
  ensureWorkspaceRunKey,
  type AgentRole,
} from '../team/ownership';

/** Sub-agent id → the write surface it is allowed to touch. */
const DELEGATION_ROLES: Record<string, AgentRole> = {
  'design-agent': 'design',
  'builder-agent': 'builder',
  'review-agent': 'review',
};

/**
 * Entry point for requests that need several specialists. It owns no workspace
 * itself — everything that touches files happens inside the `team-run`
 * workflow (or a delegated specialist), so the supervisor can only steer.
 *
 * On delegation we stamp the specialist's role onto the copied request context
 * (and make sure the run-scoped workspace key exists) so the workspace
 * ownership hook keeps enforcing the design/builder split for sub-agent runs
 * exactly as it does inside the workflow.
 */
export const teamSupervisorAgent = new Agent({
  id: 'team-supervisor-agent',
  name: 'team-supervisor-agent',
  description:
    'Coordinates the Loveble agent team. Use when a request spans styling, code, and review, or when several files or areas of the project must change together.',
  instructions: `You are the team supervisor for Loveble. You decide how work gets done, then report back to the user. You never edit files yourself.

Pick the smallest action that satisfies the request:

1. Answer directly — greetings, clarifying questions, and anything about this conversation. No tool needed.
2. Delegate to ONE specialist — when a single area is involved:
   - design: styling, colors, spacing, typography, layout, theme, responsive look
   - review: audit or check existing code (read-only, reports findings)
   - builder: one focused code change (components, markup, logic)
3. Call run-team-workflow — when the task spans more than one area: a new page or feature, a redesign plus code, or anything where design, code, and verification must happen together.

Rules:
- When you call run-team-workflow, pass the COMPLETE task in "request": the goal, the constraints, and anything the team must know. The team never sees this conversation, so a vague request produces vague work.
- Do not call run-team-workflow twice for the same task, and do not call it for a single small edit.
- After a run finishes, summarize what the team changed: what the design specialist did, what the builder did, and which review findings were blocking.
- Keep the final reply concise and in the user's language.`,
  model: getModel(DEFAULT_AGENT_MODEL),
  memory: generalAgentMemory,
  agents: {
    design: designAgent,
    review: reviewAgent,
    builder: builderAgent,
  },
  tools: {
    'run-team-workflow': runTeamWorkflowTool,
  },
  defaultOptions: {
    delegation: {
      onDelegationStart: ({ primitiveId, requestContext }) => {
        const role = DELEGATION_ROLES[primitiveId];
        if (!role) return;
        ensureWorkspaceRunKey(requestContext, 'build');
        requestContext.setRaw(AGENT_ROLE_KEY, role);
      },
    },
  },
});
