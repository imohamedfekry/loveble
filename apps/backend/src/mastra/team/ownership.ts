import { RequestContext } from '@mastra/core/request-context';

/**
 * Agent roles that can take part in a team run, and the write surface each role
 * is allowed to touch. Kept as predicate functions (no glob dependency) so the
 * "design owns styles / builder owns the rest" split stays explicit and cheap to
 * evaluate inside the workspace `beforeToolCall` hook.
 */
export type AgentRole = 'design' | 'builder' | 'review' | 'security';

/** RequestContext raw key: the role the currently-executing agent plays. */
export const AGENT_ROLE_KEY = '__loveble_agentRole';

/**
 * RequestContext raw key holding a run-scoped object. Sub-agent delegation
 * shallow-copies request-context entries into a fresh RequestContext, so every
 * agent in one run receives the same object reference. The workspace service
 * keys its per-request Workspace cache by that reference, letting a whole team
 * run share a single Workspace (one write lock, one filesystem reload).
 */
export const WORKSPACE_RUN_KEY = '__loveble_workspaceRunKey';

const STYLE_EXTENSIONS = ['.css', '.scss', '.less', '.styl'];
const STYLE_DIR_PREFIXES = ['src/styles/', 'styles/', 'public/styles/'];
const DESIGN_CONFIG_BASENAMES = [
  'tailwind.config.js',
  'tailwind.config.ts',
  'tailwind.config.mjs',
  'tailwind.config.cjs',
  'postcss.config.js',
  'postcss.config.mjs',
  'postcss.config.cjs',
];
const DESIGN_FILE_BASENAMES = [
  'theme.css',
  'theme.ts',
  'theme.js',
  'tokens.css',
  'tokens.ts',
  'tokens.js',
  'globals.css',
];

function normalize(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .toLowerCase();
}

/** True when `path` is a design-owned artifact (styles, theme, tokens, tailwind). */
export function isDesignOwned(rawPath: string): boolean {
  const path = normalize(rawPath);
  const base = path.slice(path.lastIndexOf('/') + 1);
  if (STYLE_EXTENSIONS.some((ext) => path.endsWith(ext))) return true;
  if (STYLE_DIR_PREFIXES.some((dir) => path.startsWith(dir))) return true;
  if (DESIGN_CONFIG_BASENAMES.includes(base)) return true;
  return DESIGN_FILE_BASENAMES.includes(base);
}

/**
 * `design` and `builder` are disjoint so they can write concurrently without
 * ever racing on the same file. `review` and `security` are strictly read-only.
 */
const OWNERSHIP: Record<AgentRole, (path: string) => boolean> = {
  design: (path) => isDesignOwned(path),
  builder: (path) => !isDesignOwned(path),
  review: () => false,
  security: () => false,
};

export function ownsPath(role: AgentRole, path: string): boolean {
  return OWNERSHIP[role]?.(path) ?? false;
}

export function isAgentRole(value: unknown): value is AgentRole {
  return (
    value === 'design' ||
    value === 'builder' ||
    value === 'review' ||
    value === 'security'
  );
}

/** Reads the current agent role off a (possibly undefined) request context. */
export function getAgentRole(
  requestContext: RequestContext | undefined,
): AgentRole | undefined {
  const role = requestContext?.getRaw(AGENT_ROLE_KEY);
  return isAgentRole(role) ? role : undefined;
}

type WorkspaceMode = 'plan' | 'build';

/**
 * Resolve (creating it once if needed) the run-scoped object the workspace
 * service caches its Workspace instance by. Storing the object on the *base*
 * request context before a team run fans out guarantees every branch inherits
 * the same reference through context copies — and therefore the same Workspace,
 * write lock, and filesystem snapshot.
 */
export function ensureWorkspaceRunKey<T>(
  requestContext: RequestContext<T>,
  mode: WorkspaceMode,
): object {
  const key = `${WORKSPACE_RUN_KEY}:${mode}`;
  const existing = requestContext.getRaw(key);
  if (existing && typeof existing === 'object') {
    return existing;
  }
  const created: object = {};
  requestContext.setRaw(key, created);
  return created;
}

/**
 * Build a per-agent request context for a team run: a fresh context holding a
 * shallow copy of `base`'s entries (so the shared `workspaceRunKey` object is
 * passed by reference) plus the agent's role, which the workspace ownership
 * hook enforces. A copy is required because parallel branches run at the same
 * time and must not overwrite each other's role on a shared context.
 */
export function scopeRequestContextForRole(
  base: RequestContext,
  role: AgentRole,
): RequestContext {
  const scoped = new RequestContext();
  for (const [key, value] of base.entries()) {
    scoped.setRaw(String(key), value);
  }
  scoped.setRaw(AGENT_ROLE_KEY, role);
  return scoped;
}

export class PathOwnershipError extends Error {
  constructor(
    public readonly role: AgentRole,
    public readonly path: string,
  ) {
    super(
      `The ${role} agent is not allowed to modify "${path}". ` +
        `It is outside the ${role} agent's file ownership. ` +
        `Ask the file's owning agent to make this change instead.`,
    );
    this.name = 'PathOwnershipError';
  }
}
