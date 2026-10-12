import { Mastra } from '@mastra/core/mastra';
import { generalAgentStorage } from 'src/common/inngest/agents/memory';
import { createNamingAgent } from './agents/naming.agent';
import { plannerAgent } from './agents/planner.agent';
import { builderAgent } from './agents/builder.agent';
import { designAgent } from './agents/team/design.agent';
import { reviewAgent } from './agents/team/review.agent';
import { teamSupervisorAgent } from './agents/team-supervisor.agent';
import { teamRunWorkflow } from './workflows/team-run.workflow';

export const mastra = new Mastra({
  // Shared with `generalAgentMemory`. Workflow snapshots, background tasks, and
  // agent memory all live in the same Postgres schema (`mastra` by default).
  storage: generalAgentStorage,
  backgroundTasks: {
    enabled: true,
    globalConcurrency: 10,
    perAgentConcurrency: 5,
    defaultTimeoutMs: 900_000,
  },
  agents: {
    'naming-agent': createNamingAgent(),
    'planner-agent': plannerAgent,
    'builder-agent': builderAgent,
    // Team specialists: registered so the `team-run` workflow can resolve them
    // and so they show up in agent listings alongside the chat agents.
    'design-agent': designAgent,
    'review-agent': reviewAgent,
    // Streams for requests that need several specialists; decides between
    // answering directly, delegating one specialist, or running the team.
    'team-supervisor-agent': teamSupervisorAgent,
  },
  workflows: {
    'team-run': teamRunWorkflow,
  },
});
