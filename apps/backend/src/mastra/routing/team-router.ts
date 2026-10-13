import { generateText } from 'ai';

import { DEFAULT_AGENT_MODEL, getModel } from 'src/ai/providers';
import { CHAT_AGENT_IDS, type ChatMode } from '../agents/chat-agents';

export const TEAM_SUPERVISOR_AGENT_ID = 'team-supervisor-agent';

/** Routing must never stall the stream, so the tie-breaker gets a hard budget. */
const CLASSIFIER_TIMEOUT_MS = 4_000;
/** Only the head of the message is classified; the team never sees the rest here. */
const CLASSIFIER_INPUT_LIMIT = 1_500;

const DESIGN_SIGNALS = [
  /\bcolou?rs?\b/,
  /\bstyles?(heet)?s?\b/,
  /\bcss\b/,
  /\btailwind\b/,
  /\bthemes?\b/,
  /\btypograph(y|ical)\b/,
  /\bfonts?\b/,
  /\bspacing\b/,
  /\blayout\b/,
  /\bdesign\b/,
  /\bresponsive\b/,
  /\bdark mode\b/,
  /\banimations?\b/,
  /\bpalette\b/,
  /\bvisual\b/,
];

const CODE_SIGNALS = [
  /\bcomponents?\b/,
  /\bpages?\b/,
  /\bfeatures?\b/,
  /\bforms?\b/,
  /\bstate\b/,
  /\bapi\b/,
  /\broutes?\b/,
  /\bimplement(ing|ation)?\b/,
  /\bbuild(ing)?\b/,
  /\bcreat(e|ing)\b/,
  /\badd(ing)?\b/,
  /\bintegrat(e|ing|ion)\b/,
  /\blogic\b/,
  /\bhooks?\b/,
  /\bfetch(ing)?\b/,
  /\bsubmit(ting|tal)?\b/,
];

const REVIEW_SIGNALS = [
  /\breview(ing)?\b/,
  /\baudit(ing)?\b/,
  /\bcheck(ing)?\b/,
  /\bverify(ing)?\b/,
  /\binspect(ing|ion)?\b/,
  /\baccessib\w*\b/,
  /\bbugs?\b/,
  /\bquality\b/,
  /\btests?\b/,
];

/** Signals that the request is bigger than a single focused edit. */
const SCOPE_SIGNALS = [
  /\blanding page\b/,
  /\bredesign\b/,
  /\bfrom scratch\b/,
  /\bwhole\b/,
  /\bentire\b/,
  /\bmultiple pages\b/,
  /\bhomepage\b/,
  /\bdashboard\b/,
  /\bevery page\b/,
  /\ball (the )?pages\b/,
  /\bacross the\b/,
  /\bfull(y|-)\b/,
  /\bmulti[- ]?step\b/,
];

function anyMatch(patterns: RegExp[], text: string): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export type HeuristicTrigger = 'team' | 'builder' | 'uncertain';

/**
 * Messages shorter than this are treated as trivial chat / one-line asks and go
 * straight to the builder without paying for a classifier round-trip.
 */
const TRIVIAL_LENGTH = 40;
/** A single, clearly-focused area under this length is a small edit. */
const FOCUSED_LENGTH = 60;

/**
 * Cheap, deterministic first pass. It only short-circuits the obvious cases;
 * anything substantial that carries no English signal (e.g. an Arabic request)
 * returns `uncertain` so the language-agnostic LLM classifier can place it.
 */
export function heuristicTrigger(rawMessage: string): HeuristicTrigger {
  const message = rawMessage.toLowerCase();
  const areas =
    (anyMatch(DESIGN_SIGNALS, message) ? 1 : 0) +
    (anyMatch(CODE_SIGNALS, message) ? 1 : 0) +
    (anyMatch(REVIEW_SIGNALS, message) ? 1 : 0);
  const scoped = anyMatch(SCOPE_SIGNALS, message);
  const length = rawMessage.length;

  if (areas >= 2) return 'team';
  if (areas === 1) {
    if (scoped && length >= FOCUSED_LENGTH) return 'team';
    if (length < FOCUSED_LENGTH) return 'builder';
    return 'uncertain';
  }
  // No English signal: a genuinely short line is chat, anything longer needs
  // the classifier because the heuristic only understands English keywords.
  if (length < TRIVIAL_LENGTH) return 'builder';
  return 'uncertain';
}

/**
 * Tie-breaker for messages the heuristic cannot place. Any failure (Bifrost or
 * Ollama being down, a timeout) fails open to the regular build agent so chat
 * keeps working without the team.
 */
export async function classifyWithLlm(
  rawMessage: string,
): Promise<'team' | 'builder'> {
  try {
    const { text } = await generateText({
      model: getModel(DEFAULT_AGENT_MODEL),
      system: `You route one user request inside a website builder app. The request may be written in ANY language (e.g. English, Arabic) — judge the intent, not the spelling.

Answer with exactly one word:
TEAM — the request needs several specialists working together (styling plus code plus review), or it is a large multi-part build.
BUILDER — one focused change a single coding agent can make, a small question, or chat.

Reply with only TEAM or BUILDER.`,
      prompt: rawMessage.slice(0, CLASSIFIER_INPUT_LIMIT),
      abortSignal: AbortSignal.timeout(CLASSIFIER_TIMEOUT_MS),
    });
    // Match only the first token so an echo like "BUILDER — not TEAM" cannot
    // flip the route; anything unrecognised falls through to the builder.
    const first = text.trim().split(/\s+/)[0] ?? '';
    return /^team$/i.test(first) ? 'team' : 'builder';
  } catch (error) {
    console.warn('[team-router] classifier fell back to builder:', error);
    return 'builder';
  }
}

export type ChatRoute = {
  agentId: string;
  reason: 'plan-mode' | 'heuristic' | 'classifier' | 'default';
};

/**
 * Picks the chat agent for one request: the planner for plan mode, the team
 * supervisor when the request needs several specialists, otherwise the builder.
 * Routing is based purely on need — a project's first message is treated like
 * any other, so a large first prompt can still reach the team.
 */
export function resolveChatAgent(params: {
  mode: ChatMode;
  message: string;
}): ChatRoute {
  const { mode } = params;

  if (mode === 'plan') {
    return { agentId: CHAT_AGENT_IDS.plan, reason: 'plan-mode' };
  }

  // Team building disabled for stability: default to builder agent for build mode.
  return { agentId: CHAT_AGENT_IDS.build, reason: 'default' };
}
