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

/** Minimum gap between live partial-text emissions from a running specialist. */
const PARTIAL_THROTTLE_MS = 400;

/**
 * Hard wall-clock budget per specialist. A single hanging tool call or model
 * stall must never wedge the whole team run (and the chat stream above it)
 * forever — when the budget hits we abort the stream and finish the phase with
 * whatever partial summary + tool calls were produced so far.
 */
const SPECIALIST_TIMEOUT_MS = 10 * 60_000;

/**
 * Blind-stall budget: if a specialist produces no text chunk and no finished
 * step within this window (e.g. the first model call never answers), abort
 * early instead of sitting silent until the total budget. The timer resets on
 * every sign of life.
 */
const FIRST_OUTPUT_STALL_MS = 3 * 60_000;

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

  // Stream the specialist so the UI can watch it work instead of waiting for
  // the whole run. Text is throttled; tool calls are surfaced as each step
  // finishes so the user sees the files/commands being touched live.
  const tools: TeamToolCall[] = [];
  let liveText = '';
  let lastEmit = 0;
  let stepCount = 0;
  const startedAt = Date.now();

  const emitProgress = (force = false) => {
    const now = Date.now();
    if (!force && now - lastEmit < PARTIAL_THROTTLE_MS) return;
    lastEmit = now;
    teamRunEvents.emit({
      ...base,
      status: 'start',
      detail: liveText.slice(0, DETAIL_LIMIT),
      ...(tools.length > 0 ? { tools: [...tools] } : {}),
    });
  };

  const controller = new AbortController();
  let abortReason: 'budget' | 'stall' | null = null;
  const budgetTimer = setTimeout(() => {
    abortReason = 'budget';
    console.warn(
      `[team-run] ${phase} hit the ${SPECIALIST_TIMEOUT_MS / 60000}min budget after ${stepCount} steps, aborting`,
    );
    controller.abort();
  }, SPECIALIST_TIMEOUT_MS);
  // Budgeted streams must not keep the process alive on their own.
  budgetTimer.unref?.();

  // Blind-stall watchdog: reset on every chunk / finished step. If the agent
  // goes silent (typically a first model call that never answers), abort long
  // before the total budget so the user isn't left staring at a frozen phase.
  let stallTimer: ReturnType<typeof setTimeout> | null = null;
  const pokeStall = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      abortReason = 'stall';
      console.warn(
        `[team-run] ${phase} produced no output for ${FIRST_OUTPUT_STALL_MS / 60000}min after ${stepCount} steps, aborting`,
      );
      controller.abort();
    }, FIRST_OUTPUT_STALL_MS);
    stallTimer.unref?.();
  };

  try {
    // Arm the stall watchdog before stream creation too — memory/thread
    // loading happens inside this await and must not hang silently either.
    pokeStall();
    const stream = await agent.stream(prompt, {
      requestContext: scopeRequestContextForRole(requestContext, role),
      maxSteps,
      ...(memory ? { memory } : {}),
      abortSignal: controller.signal,
      onStepFinish: (step) => {
        stepCount += 1;
        const stepTools = extractTools({
          toolCalls: (step.toolCalls ?? []) as unknown[],
        });
        if (stepTools.length > 0) {
          tools.push(...stepTools);
        }
        console.log(
          `[team-run] ${phase} step ${stepCount} done in ${Date.now() - startedAt}ms tools=${stepTools.length}`,
        );
        pokeStall();
        emitProgress(true);
      },
    });
    console.log(
      `[team-run] ${phase} stream opened in ${Date.now() - startedAt}ms`,
    );
    pokeStall();

    const reader = stream.textStream.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          liveText += value;
          pokeStall();
          emitProgress();
        }
      }
    } finally {
      reader.releaseLock();
    }

    const finalText = await stream.text;
    const summary = (finalText || liveText).trim();
    const allTools =
      tools.length > 0
        ? tools
        : extractTools({ toolCalls: await stream.toolCalls });

    console.log(
      `[team-run] ${phase} finished in ${Date.now() - startedAt}ms steps=${stepCount} tools=${allTools.length}`,
    );
    teamRunEvents.emit({
      ...base,
      status: 'done',
      detail: summary.slice(0, DETAIL_LIMIT),
      tools: allTools,
    });
    return { summary, tools: allTools };
  } catch (error) {
    // Aborted by our own watchdog: if the phase produced anything, finish with
    // the partial work so the run completes. With zero output there is nothing
    // to keep — fail loudly so the supervisor sees the stall and can react
    // instead of reporting a success that built nothing.
    if (controller.signal.aborted) {
      const summary = liveText.trim();
      if (summary || tools.length > 0) {
        console.warn(
          `[team-run] ${phase} aborted (${abortReason ?? 'unknown'}) after ${Date.now() - startedAt}ms steps=${stepCount}, keeping partial summary (${summary.length} chars) + ${tools.length} tools`,
        );
        teamRunEvents.emit({
          ...base,
          status: 'done',
          detail: summary.slice(0, DETAIL_LIMIT),
          tools,
        });
        return { summary, tools };
      }
      const message = `${phase} specialist produced no output before abort (${abortReason ?? 'unknown'} after ${Date.now() - startedAt}ms, ${stepCount} steps) — likely a stalled model call`;
      console.error(`[team-run] ${message}`);
      teamRunEvents.emit({ ...base, status: 'error', detail: message });
      throw new Error(message, { cause: error });
    }
    teamRunEvents.emit({ ...base, status: 'error', detail: describe(error) });
    throw error;
  } finally {
    clearTimeout(budgetTimer);
    if (stallTimer) clearTimeout(stallTimer);
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

Own the visual layer only: stylesheets, theme/tokens, styling configuration,
global styles. Do not touch components or application logic — the
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
files, theme/tokens, or styling configuration; that surface belongs to the design
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
