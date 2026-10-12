import type { Agent } from '@mastra/core/agent';
import type { RequestContext } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { builderAgent } from '../agents/builder.agent';
import { designAgent } from '../agents/team/design.agent';
import { reviewAgent } from '../agents/team/review.agent';
import {
  ensureWorkspaceRunKey,
  scopeRequestContextForRole,
  type AgentRole,
} from '../team/ownership';
import {
  teamRunEvents,
  type TeamRunPhase,
  type TeamToolCall,
} from '../team/team-events';

const briefSchema = z.object({ brief: z.string() });

/** How much of an agent's summary to stream to the live monitor panel. */
const DETAIL_LIMIT = 2000;

/** One tool call an agent made, surfaced to the UI so a run is inspectable. */
const toolSchema = z.object({
  name: z.string(),
  target: z.string().optional(),
});

const designResultSchema = z.object({
  role: z.literal('design'),
  summary: z.string(),
  tools: z.array(toolSchema),
});

const reviewResultSchema = z.object({
  role: z.literal('review'),
  summary: z.string(),
  tools: z.array(toolSchema),
});

const teamRunOutputSchema = z.object({
  summary: z.string(),
  design: designResultSchema,
  review: reviewResultSchema,
  builderTools: z.array(toolSchema),
});

export type TeamRunOutput = z.infer<typeof teamRunOutputSchema>;

/** Keys, in priority order, that identify what a tool call acted on. */
const TARGET_KEYS = [
  'path',
  'file',
  'query',
  'pattern',
  'command',
  'url',
  'question',
  'name',
] as const;

function toolTarget(args: unknown): string | undefined {
  if (!args || typeof args !== 'object') return undefined;
  const record = args as Record<string, unknown>;
  for (const key of TARGET_KEYS) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

/**
 * Normalize one tool-call entry into `{ name, target }`.
 *
 * Mastra is inconsistent here: `FullOutput.toolCalls` and `step.toolCalls` hold
 * raw stream chunks shaped `{ type: 'tool-call', payload: { toolName, args } }`,
 * while the durable path surfaces flat `{ toolName, args }` objects. Accept
 * both so a run stays inspectable across both code paths.
 */
function pickToolCall(raw: unknown): TeamToolCall | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const entry = raw as {
    toolName?: unknown;
    name?: unknown;
    args?: unknown;
    input?: unknown;
    payload?: {
      toolName?: unknown;
      name?: unknown;
      args?: unknown;
      input?: unknown;
    };
  };
  const payload = entry.payload ?? entry;
  const rawName = payload.toolName ?? payload.name;
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (!name) return undefined;
  return { name, target: toolTarget(payload.args ?? payload.input) };
}

/**
 * Pull the tool calls an agent made out of its `generate` result. Prefers the
 * flat `toolCalls` list and falls back to the per-step lists.
 */
function extractTools(result: unknown): TeamToolCall[] {
  const record = result as {
    toolCalls?: unknown[];
    steps?: { toolCalls?: unknown[] }[];
  };

  const calls: unknown[] = [];
  if (Array.isArray(record.toolCalls) && record.toolCalls.length > 0) {
    calls.push(...record.toolCalls);
  } else {
    for (const step of record.steps ?? []) {
      if (Array.isArray(step?.toolCalls)) calls.push(...step.toolCalls);
    }
  }

  return calls
    .map(pickToolCall)
    .filter((tool): tool is TeamToolCall => Boolean(tool));
}

function projectIdOf(requestContext: RequestContext): string | undefined {
  const raw = requestContext.get('projectId');
  return typeof raw === 'string' ? raw : undefined;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type SpecialistRun = {
  agent: Agent;
  role: AgentRole;
  prompt: string;
  phase: TeamRunPhase;
  requestContext: RequestContext;
  runId: string;
  maxSteps: number;
  memory?: { thread: string; resource: string };
};

/**
 * Run one specialist with a role-scoped request context. Each branch of the
 * parallel fan-out gets its own context copy (so roles never race) while the
 * run-scoped workspace key is shared by reference, so every agent reads and
 * writes through one Workspace / write lock.
 */
async function runSpecialist({
  agent,
  role,
  prompt,
  phase,
  requestContext,
  runId,
  maxSteps,
  memory,
}: SpecialistRun): Promise<{ summary: string; tools: TeamToolCall[] }> {
  const base = {
    runId,
    projectId: projectIdOf(requestContext),
    phase,
  };
  teamRunEvents.emit({ ...base, status: 'start' });
  try {
    const result = await agent.generate(prompt, {
      requestContext: scopeRequestContextForRole(requestContext, role),
      maxSteps,
      ...(memory ? { memory } : {}),
    });
    const summary = result.text.trim();
    const tools = extractTools(result);
    teamRunEvents.emit({
      ...base,
      status: 'done',
      detail: summary.slice(0, DETAIL_LIMIT),
      tools,
    });
    return { summary, tools };
  } catch (error) {
    teamRunEvents.emit({ ...base, status: 'error', detail: describe(error) });
    throw error;
  }
}

/**
 * Establishes the run-scoped workspace key before the fan-out so every branch
 * inherits the same Workspace, and reports the request that entered the team.
 */
const prepareStep = createStep({
  id: 'prepare',
  inputSchema: z.object({ request: z.string() }),
  outputSchema: briefSchema,
  execute: ({ inputData, requestContext, runId }) => {
    ensureWorkspaceRunKey(requestContext, 'build');
    const projectId = projectIdOf(requestContext);
    const detail = inputData.request.slice(0, DETAIL_LIMIT);
    teamRunEvents.emit({ runId, projectId, phase: 'prepare', status: 'start' });
    teamRunEvents.emit({
      runId,
      projectId,
      phase: 'prepare',
      status: 'done',
      detail,
    });
    return Promise.resolve({ brief: inputData.request });
  },
});

const designStep = createStep({
  id: 'design',
  inputSchema: briefSchema,
  outputSchema: designResultSchema,
  execute: async ({ inputData, requestContext, runId }) => {
    const { summary, tools } = await runSpecialist({
      agent: designAgent,
      role: 'design',
      phase: 'design',
      prompt: `You are the design specialist in a team run for this project.

Request:
${inputData.brief}

Own the visual layer only: stylesheets, theme/tokens, Tailwind and PostCSS
config, global styles. Do not touch components or application logic — the
builder owns that surface and the workspace will reject your writes there.

Read the existing styles and structure first, extend the current design system
rather than introducing a parallel one, then reply with a short summary of the
files you changed and the design decisions you made.`,
      requestContext,
      runId,
      maxSteps: 15,
    });
    return { role: 'design' as const, summary, tools };
  },
});

const reviewStep = createStep({
  id: 'review',
  inputSchema: briefSchema,
  outputSchema: reviewResultSchema,
  // Read-only, so a retry can never duplicate a side effect.
  retries: 1,
  execute: async ({ inputData, requestContext, runId }) => {
    const { summary, tools } = await runSpecialist({
      agent: reviewAgent,
      role: 'review',
      phase: 'review',
      prompt: `You are the review specialist in a team run for this project. You are strictly READ-ONLY.

Request:
${inputData.brief}

Audit the current project against this request: correctness, edge cases,
accessibility, responsiveness, and consistency with the existing code and
design system. Report findings as a short prioritized list, each marked
[blocking] or [non-blocking] with a concrete suggested fix. If the project
already satisfies the request, say so briefly.`,
      requestContext,
      runId,
      maxSteps: 12,
    });
    return { role: 'review' as const, summary, tools };
  },
});

const builderStep = createStep({
  id: 'builder',
  inputSchema: z.object({
    design: designResultSchema,
    review: reviewResultSchema,
  }),
  outputSchema: teamRunOutputSchema,
  execute: async (params) => {
    const { inputData, requestContext, runId } = params;
    const { request } = params.getInitData<{ request: string }>();
    const projectId = projectIdOf(requestContext);
    const thread = String(requestContext.get('conversationId') ?? '');
    const resource = String(requestContext.get('userId') ?? '');

    const { summary, tools } = await runSpecialist({
      agent: builderAgent,
      role: 'builder',
      phase: 'builder',
      prompt: `You are the builder in a team run for this project.

Request:
${request}

Design specialist output (styling is already handled — do NOT edit style
files, theme/tokens, or Tailwind config; that surface belongs to the design
specialist):
${inputData.design.summary}

Review findings (address the blocking ones in code; the reviewer cannot edit):
${inputData.review.summary}

Implement the request in the application code: components, markup, state, and
logic. Read files before editing them, keep changes focused, and reply with a
short summary of what you changed.`,
      requestContext,
      runId,
      maxSteps: 25,
      ...(thread && resource ? { memory: { thread, resource } } : {}),
    });

    teamRunEvents.emit({
      runId,
      projectId,
      phase: 'done',
      status: 'done',
      detail: summary.slice(0, 600),
      tools,
    });

    return {
      summary,
      design: inputData.design,
      review: inputData.review,
      builderTools: tools,
    };
  },
});

/**
 * Team run: prepare → (design ∥ review) → builder.
 *
 * `design` and `review` run concurrently because ownership is disjoint —
 * design may only touch styles, review may not write at all — so the two can
 * never contend for the same file. The builder runs last, integrating the
 * code-level changes around whatever the design specialist produced.
 */
export const teamRunWorkflow = createWorkflow({
  id: 'team-run',
  description:
    'Runs a design/review/build team in parallel over one project workspace.',
  inputSchema: z.object({ request: z.string() }),
  outputSchema: teamRunOutputSchema,
  retryConfig: { attempts: 1, delay: 1000 },
})
  .then(prepareStep)
  .parallel([designStep, reviewStep])
  .then(builderStep)
  .commit();
