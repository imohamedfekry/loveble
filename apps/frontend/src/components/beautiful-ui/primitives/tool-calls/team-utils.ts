import { WORKSPACE_PREFIX } from "./constants";
import type { LiveState, TeamRunLiveEvent, TeamTool } from "./types";

export function teamField(source: unknown, key: string): string | undefined {
  if (!source || typeof source !== "object") return undefined;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function teamTools(source: unknown, key: string): TeamTool[] {
  if (!source || typeof source !== "object") return [];
  const value = (source as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is TeamTool =>
      !!entry &&
      typeof entry === "object" &&
      typeof (entry as { name?: unknown }).name === "string",
  );
}

/** Strip the workspace prefix to get the bare tool id (e.g. `write_file`). */
export function teamToolBase(name: string): string {
  return name.startsWith(WORKSPACE_PREFIX)
    ? name.slice(WORKSPACE_PREFIX.length)
    : name;
}

export const EMPTY_LIVE: LiveState = {
  runId: null,
  status: {},
  detail: {},
  tools: {},
};

/** Fold one `team:run` socket event into the live view; a new run resets it. */
export function nextLive(prev: LiveState, event: TeamRunLiveEvent): LiveState {
  const base =
    prev.runId === event.runId
      ? prev
      : { runId: event.runId, status: {}, detail: {}, tools: {} };
  if (event.phase === "done") return base;

  return {
    ...base,
    status: {
      ...base.status,
      [event.phase]:
        event.status === "error"
          ? "error"
          : event.status === "done"
            ? "done"
            : "running",
    },
    detail: event.detail
      ? { ...base.detail, [event.phase]: event.detail }
      : base.detail,
    tools:
      event.tools && event.tools.length > 0
        ? { ...base.tools, [event.phase]: event.tools }
        : base.tools,
  };
}
