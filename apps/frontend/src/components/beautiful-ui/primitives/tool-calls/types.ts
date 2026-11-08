export type ToolPart = {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

export type Detail =
  | { kind: "file"; path: string; name: string; isFolder: boolean }
  | { kind: "code"; text: string }
  | { kind: "search"; text: string };

/** The expandable payload behind a tool row: what it sent and what it got back. */
export type ToolSection = { label: string; text: string };

/** One tool a team specialist called: name plus the path/query it touched. */
export type TeamTool = { name: string; target?: string };

export type LivePhase = "prepare" | "design" | "review" | "builder";
export type LiveStatus = "running" | "done" | "error";

export type TeamRunLiveEvent = {
  runId: string;
  projectId?: string;
  phase: LivePhase | "done";
  status: "start" | "done" | "error";
  detail?: string;
  tools?: TeamTool[];
};

export type LiveState = {
  runId: string | null;
  status: Partial<Record<LivePhase, LiveStatus>>;
  detail: Partial<Record<LivePhase, string>>;
  tools: Partial<Record<LivePhase, TeamTool[]>>;
};

export type AgentState = "idle" | "running" | "done" | "error";
