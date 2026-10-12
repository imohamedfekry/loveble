"use client";

import { useEffect, useMemo, useState } from "react";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";

import { useEditor } from "@/lib/hooks/use-editor";
import { useFilesStore } from "@/store/file.store";
import { socket } from "@/lib/socket/socket";
import type { ProjectFileType } from "@/lib/api/apis/files/types";

/* ─────────────────────────────────────────────────────────
 * TOOL CALLS — agent tool trace
 *
 * Rendered from the assistant's tool parts, styled like the
 * ThinkingState "Coding" trace: a shimmering header while tools
 * run, then a settled summary. Rows show a friendly label plus
 * the file / command / search the tool touched — never raw tool
 * names or JSON. File rows open the file in the editor.
 * ───────────────────────────────────────────────────────── */

export type ToolPart = {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

const EMPTY_FILES: ProjectFileType[] = [];
const WORKSPACE_PREFIX = "mastra_workspace_";
const TEAM_TOOL = "run-team-workflow";
const ASK_TOOL = "ask-user";

const TOOL_LABELS: Record<string, string> = {
  read_file: "Read",
  write_file: "Write file",
  edit_file: "Update file",
  ast_edit: "Update file",
  list_files: "List files",
  file_stat: "File info",
  delete: "Delete file",
  mkdir: "Create folder",
  grep: "Search files",
  search: "Search",
  index: "Index files",
  execute_command: "Run",
  get_process_output: "Read output",
  kill_process: "Stop process",
  "web-search": "Search the web",
  "web-crawl": "Read page",
  updateWorkingMemory: "Update memory",
};

type Category = "command" | "read" | "write" | "search" | "other";

const CATEGORY: Record<string, Category> = {
  execute_command: "command",
  read_file: "read",
  list_files: "read",
  file_stat: "read",
  get_process_output: "read",
  write_file: "write",
  edit_file: "write",
  ast_edit: "write",
  delete: "write",
  mkdir: "write",
  index: "write",
  grep: "search",
  search: "search",
  "web-search": "search",
};

type Detail =
  | { kind: "file"; path: string; name: string; isFolder: boolean }
  | { kind: "code"; text: string }
  | { kind: "search"; text: string };

function toolBase(part: ToolPart): string {
  const raw =
    part.toolName ??
    (part.type.startsWith("tool-") ? part.type.slice(5) : part.type);
  return raw.startsWith(WORKSPACE_PREFIX)
    ? raw.slice(WORKSPACE_PREFIX.length)
    : raw;
}

function prettify(base: string): string {
  return base
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

/** Mastra reports create vs update in the write output — mirror it in the label. */
function labelFor(part: ToolPart, base: string): string {
  if (base === "write_file" || base === "edit_file" || base === "ast_edit") {
    const output = typeof part.output === "string" ? part.output : "";
    if (output.startsWith("Created ")) return "Create file";
    if (output.startsWith("Updated ")) return "Update file";
  }
  return TOOL_LABELS[base] ?? prettify(base);
}

function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^(\.\/|\/)+/, "")
    .split("/")
    .filter(Boolean)
    .join("/");
}

function inputString(input: unknown, key: string): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function detailFor(base: string, input: unknown): Detail | undefined {
  if (base === "execute_command") {
    const command = inputString(input, "command");
    return command ? { kind: "code", text: command } : undefined;
  }

  if (base === "grep" || base === "search" || base === "web-search") {
    const pattern =
      inputString(input, "pattern") ??
      inputString(input, "query") ??
      inputString(input, "q");
    const path = inputString(input, "path");
    if (!pattern) return undefined;
    return {
      kind: "search",
      text: path && path !== "." ? `${pattern} in ${path}` : pattern,
    };
  }

  if (
    base === "read_file" ||
    base === "write_file" ||
    base === "edit_file" ||
    base === "ast_edit" ||
    base === "delete" ||
    base === "file_stat" ||
    base === "mkdir" ||
    base === "list_files"
  ) {
    const raw = inputString(input, "path");
    if (!raw) return undefined;
    const path = normalizePath(raw);
    const name = path.split("/").pop() || path;
    return {
      kind: "file",
      path,
      name,
      isFolder: base === "mkdir" || base === "list_files",
    };
  }

  const fallback = inputString(input, "query") ?? inputString(input, "url");
  return fallback ? { kind: "code", text: fallback } : undefined;
}

/** Map of project-relative path → node, so tool paths resolve to openable files. */
function buildPathIndex(
  files: ProjectFileType[],
): Map<string, ProjectFileType> {
  const byId = new Map(files.map((file) => [file.id, file]));

  const resolve = (file: ProjectFileType, depth: number): string => {
    if (!file.parentId || depth > 64) return file.name;
    const parent = byId.get(file.parentId);
    if (!parent) return file.name;
    return `${resolve(parent, depth + 1)}/${file.name}`;
  };

  const index = new Map<string, ProjectFileType>();
  for (const file of files) {
    index.set(normalizePath(resolve(file, 0)), file);
  }
  return index;
}

function summarize(bases: string[]): string {
  const counts = { command: 0, read: 0, write: 0, search: 0, other: 0 };
  for (const base of bases) {
    counts[CATEGORY[base] ?? "other"] += 1;
  }

  const segments: string[] = [];
  if (counts.command) {
    segments.push(
      counts.command === 1 ? "Ran 1 command" : `Ran ${counts.command} commands`,
    );
  }
  if (counts.read) {
    segments.push(
      counts.read === 1 ? "read 1 file" : `read ${counts.read} files`,
    );
  }
  if (counts.write) {
    segments.push(
      counts.write === 1 ? "edited 1 file" : `edited ${counts.write} files`,
    );
  }
  if (counts.search) {
    segments.push(
      counts.search === 1
        ? "searched 1 time"
        : `searched ${counts.search} times`,
    );
  }
  if (counts.other) {
    segments.push(
      counts.other === 1 ? "ran 1 tool" : `ran ${counts.other} tools`,
    );
  }

  if (segments.length === 0) return "Ran tools";
  if (segments[0]!.startsWith("Ran ")) return segments.join(" · ");
  return [`Ran ${bases.length} ${bases.length === 1 ? "tool" : "tools"}`, ...segments].join(
    " · ",
  );
}

/**
 * The visual body of one tool row — status glyph, friendly label, and the
 * file / command / search it touched. Shared by the tool timeline and the
 * nested team-run rows so both read as tools, never as prose.
 */
function ToolRowContent({
  label,
  running,
  failed,
  detail,
  node,
}: {
  label: string;
  running: boolean;
  failed: boolean;
  detail?: Detail;
  node?: ProjectFileType;
}) {
  const canOpen = node?.type === "file";

  return (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center">
        {running ? (
          <span
            className="size-3 rounded-full border-[1.5px] border-line-strong border-t-ink-2"
            style={{ animation: "spin 700ms linear infinite" }}
          />
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={failed ? "text-red" : "text-ink-3"}
          >
            {failed ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M20 6L9 17l-5-5" />
            )}
          </svg>
        )}
      </span>

      <span className="min-w-0 shrink-0 truncate text-[12.5px] font-medium text-ink">
        {label}
      </span>

      {detail?.kind === "file" && (
        <span
          className="inline-flex h-5.5 min-w-0 max-w-60 items-center gap-1 rounded-chip bg-field px-1.5 font-mono text-[11.5px] text-ink-2 shadow-hairline"
          title={detail.path}
        >
          {detail.isFolder ? (
            <FolderIcon
              folderName={detail.name}
              className="size-4 shrink-0"
            />
          ) : (
            <FileIcon
              fileName={detail.name}
              autoAssign
              className="size-4 shrink-0"
            />
          )}
          <span className="truncate">{detail.name}</span>
        </span>
      )}

      {detail?.kind === "code" && (
        <span className="min-w-0 flex-1 truncate rounded-chip bg-field px-1.5 font-mono text-[11.5px] text-ink-2 shadow-hairline">
          {detail.text}
        </span>
      )}

      {detail?.kind === "search" && (
        <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">
          {detail.text}
        </span>
      )}

      {canOpen && (
        <span className="ml-auto shrink-0 text-[11px] text-ink-3 opacity-0 transition-opacity duration-150 group-hover/row:opacity-100">
          Open
        </span>
      )}
    </>
  );
}

export function ToolCalls({
  parts,
  projectId,
  className,
  onQuickReply,
}: {
  parts: ToolPart[];
  projectId: string;
  className?: string;
  onQuickReply?: (text: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const files = useFilesStore((state) => state.files[projectId] ?? EMPTY_FILES);
  const pathIndex = useMemo(() => buildPathIndex(files), [files]);
  const { openFile } = useEditor(projectId);

  // The team workflow and ask-user tools get bespoke UI, not generic rows.
  const teamParts = useMemo(
    () => parts.filter((part) => toolBase(part) === TEAM_TOOL),
    [parts],
  );
  const askParts = useMemo(
    () => parts.filter((part) => toolBase(part) === ASK_TOOL),
    [parts],
  );
  const timelineParts = useMemo(
    () =>
      parts.filter((part) => {
        const base = toolBase(part);
        return base !== TEAM_TOOL && base !== ASK_TOOL;
      }),
    [parts],
  );

  const rows = useMemo(
    () =>
      timelineParts.map((part) => {
        const base = toolBase(part);
        const running =
          part.state === "input-streaming" || part.state === "input-available";
        const failed = part.state === "output-error" || !!part.errorText;
        const detail = detailFor(base, part.input);
        const node =
          detail?.kind === "file" ? pathIndex.get(detail.path) : undefined;

        return {
          id: part.toolCallId ?? `${base}-${detail?.kind ?? ""}`,
          base,
          label: labelFor(part, base),
          running,
          failed,
          detail,
          node,
          errorText: part.errorText,
        };
      }),
    [timelineParts, pathIndex],
  );

  if (parts.length === 0) return null;

  const running = rows.some((row) => row.running);
  const header = running
    ? "Running tools"
    : summarize(rows.map((row) => row.base));

  return (
    <div className={className}>
      {teamParts.map((part) => (
        <TeamRunReport
          key={part.toolCallId ?? part.type}
          part={part}
          projectId={projectId}
          pathIndex={pathIndex}
          onOpenFile={(id) => openFile(id, { pinned: false })}
        />
      ))}

      {askParts.map((part) => (
        <AskUserCard
          key={part.toolCallId ?? part.type}
          part={part}
          onQuickReply={onQuickReply}
        />
      ))}

      {timelineParts.length > 0 && (
        <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="-mx-1.5 flex w-fit max-w-full items-center gap-1.5 rounded-control px-1.5 py-1 transition-colors duration-100 hover:bg-hover-2"
      >
        <span role="status" className="contents">
          {running ? (
            <span
              className="bg-clip-text text-[13px] font-medium whitespace-nowrap text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)",
                backgroundSize: "200% 100%",
                animation: "shimmer-text 1.4s linear infinite",
              }}
            >
              {header}
            </span>
          ) : (
            <span
              className="text-[13px] font-medium whitespace-nowrap text-ink-2"
              style={{ animation: "fade-in 350ms ease-out both" }}
            >
              {header}
            </span>
          )}
        </span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ink-3)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 transition-transform duration-300"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="overflow-hidden">


          <div className="relative mt-0.5 ml-[5px] pl-4">
            {/* Timeline with rounded branches */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-[3px] top-0 bottom-0 w-px bg-line"
            />

            <div className="flex flex-col gap-0.5 py-1">
              {rows.map((row, i) => {
                const canOpen = row.node?.type === "file";
                const isLast = i === rows.length - 1;

                const rowStyle = {
                  animation: `fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${i * 90}ms both`,
                };

                const content = (
                  <ToolRowContent
                    label={row.label}
                    running={row.running}
                    failed={row.failed}
                    detail={row.detail}
                    node={row.node}
                  />
                );

                const rowClass =
                  "group/row relative flex min-h-7 w-full items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-left transition-colors duration-150 hover:bg-hover";

                // Rounded branch from the vertical line to this tool.



const connector = (
  <svg
    aria-hidden="true"
    className="pointer-events-none absolute -left-[13px] top-1/2 -translate-y-1/2 overflow-visible"
    width="13"
    height="14"
    viewBox="0 0 13 14"
    fill="none"
  >
    <path
     d="M0 9 C0 10.5 1.5 12 4 12 H13"
      stroke="var(--line)"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);




                if (canOpen) {
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() =>
                        openFile(row.node!.id, { pinned: false })
                      }
                      className={rowClass}
                      style={rowStyle}
                    >
                      {connector}
                      {content}
                    </button>
                  );
                }

                if (row.failed && row.errorText) {
                  return (
                    <div key={row.id} style={rowStyle}>
                      <div className={rowClass}>
                        {connector}
                        {content}
                      </div>

                      <div className="ml-6 border-l border-line pl-3">
                        <span className="text-[11.5px] leading-[1.6] text-red">
                          {row.errorText}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={row.id}
                    className={rowClass}
                    style={rowStyle}
                  >
                    {connector}
                    {content}
                  </div>
                );
              })}
            </div>
          </div>


        </div>
      </div>
        </>
      )}
    </div>
  );
}

function teamField(source: unknown, key: string): string | undefined {
  if (!source || typeof source !== "object") return undefined;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** One tool a team specialist called: name plus the path/query it touched. */
type TeamTool = { name: string; target?: string };

function teamTools(source: unknown, key: string): TeamTool[] {
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
function teamToolBase(name: string): string {
  return name.startsWith(WORKSPACE_PREFIX)
    ? name.slice(WORKSPACE_PREFIX.length)
    : name;
}

const FILE_TOOLS = new Set([
  "read_file",
  "write_file",
  "edit_file",
  "ast_edit",
  "delete",
  "file_stat",
  "mkdir",
  "list_files",
]);

const SEARCH_TOOLS = new Set(["grep", "search", "web-search"]);

/** Rebuild a row detail from a team tool's name + target string. */
function detailFromTarget(base: string, target?: string): Detail | undefined {
  if (!target) return undefined;
  if (FILE_TOOLS.has(base)) {
    const path = normalizePath(target);
    const name = path.split("/").pop() || path;
    return {
      kind: "file",
      path,
      name,
      isFolder: base === "mkdir" || base === "list_files",
    };
  }
  if (SEARCH_TOOLS.has(base)) return { kind: "search", text: target };
  return { kind: "code", text: target };
}

/**
 * The `run-team-workflow` tool rendered exactly like the tool timeline: a
 * "Team run" header that expands into nested agent rows (Brief / Design /
 * Review / Builder), each itself expandable to reveal that agent's output.
 * Reads the tool's own input/output so it persists in the conversation.
 */
type LivePhase = "prepare" | "design" | "review" | "builder";
type LiveStatus = "running" | "done" | "error";

type TeamRunLiveEvent = {
  runId: string;
  projectId?: string;
  phase: LivePhase | "done";
  status: "start" | "done" | "error";
  detail?: string;
  tools?: TeamTool[];
};

type LiveState = {
  runId: string | null;
  status: Partial<Record<LivePhase, LiveStatus>>;
  detail: Partial<Record<LivePhase, string>>;
  tools: Partial<Record<LivePhase, TeamTool[]>>;
};

const EMPTY_LIVE: LiveState = { runId: null, status: {}, detail: {}, tools: {} };

/** Fold one `team:run` socket event into the live view; a new run resets it. */
function nextLive(prev: LiveState, event: TeamRunLiveEvent): LiveState {
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

function TeamRunReport({
  part,
  projectId,
  pathIndex,
  onOpenFile,
}: {
  part: ToolPart;
  projectId: string;
  pathIndex: Map<string, ProjectFileType>;
  onOpenFile: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [live, setLive] = useState<LiveState>(EMPTY_LIVE);

  const running =
    part.state === "input-streaming" || part.state === "input-available";
  const failed = part.state === "output-error" || !!part.errorText;

  // While the run streams, follow the team's socket progress so each agent's
  // text and tool calls appear as they happen — not only once the whole
  // workflow (and this tool call) finishes.
  useEffect(() => {
    if (!running) return;
    const onTeamRun = (event: TeamRunLiveEvent) => {
      if (event.projectId && event.projectId !== projectId) return;
      setLive((prev) => nextLive(prev, event));
    };
    socket.on("team:run", onTeamRun);
    return () => {
      socket.off("team:run", onTeamRun);
    };
  }, [running, projectId]);

  const items: {
    key: string;
    label: string;
    phase: LivePhase;
    text?: string;
    tools: TeamTool[];
  }[] = [
    {
      key: "brief",
      label: "Brief",
      phase: "prepare",
      text: teamField(part.input, "request"),
      tools: [],
    },
    {
      key: "design",
      label: "Design",
      phase: "design",
      text: teamField(part.output, "design"),
      tools: teamTools(part.output, "designTools"),
    },
    {
      key: "review",
      label: "Review",
      phase: "review",
      text: teamField(part.output, "review"),
      tools: teamTools(part.output, "reviewTools"),
    },
    {
      key: "builder",
      label: "Builder",
      phase: "builder",
      text: teamField(part.output, "summary"),
      tools: teamTools(part.output, "builderTools"),
    },
  ];

  const header = failed
    ? "Team run failed"
    : running
      ? "Team running"
      : "Team run · 3 agents";

  const toggle = (key: string) =>
    setExpanded((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div className="mb-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="-mx-1.5 flex w-fit max-w-full items-center gap-1.5 rounded-control px-1.5 py-1 transition-colors duration-100 hover:bg-hover-2"
      >
        <span role="status" className="contents">
          {running ? (
            <span
              className="bg-clip-text text-[13px] font-medium whitespace-nowrap text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)",
                backgroundSize: "200% 100%",
                animation: "shimmer-text 1.4s linear infinite",
              }}
            >
              {header}
            </span>
          ) : (
            <span
              className="text-[13px] font-medium whitespace-nowrap text-ink-2"
              style={{ animation: "fade-in 350ms ease-out both" }}
            >
              {header}
            </span>
          )}
        </span>
        <Chevron open={open} />
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-0.5 ml-[5px] pl-4">
            <div
              aria-hidden
              className="pointer-events-none absolute left-[3px] top-0 bottom-0 w-px bg-line"
            />

            <div className="flex flex-col gap-0.5 py-1">
              {items.map((item, index) => {
                const liveText = running ? live.detail[item.phase] : undefined;
                const text = liveText ?? item.text ?? "";
                const liveTools = running ? live.tools[item.phase] : undefined;
                const tools =
                  liveTools && liveTools.length > 0 ? liveTools : item.tools;
                const liveStatus = running ? live.status[item.phase] : undefined;
                const isOpen = !!expanded[item.key];
                const expandable = Boolean(text) || tools.length > 0;
                const state: AgentState =
                  liveStatus === "error"
                    ? "error"
                    : liveStatus === "done"
                      ? "done"
                      : liveStatus === "running"
                        ? "running"
                        : text || tools.length > 0
                          ? "done"
                          : failed
                            ? "error"
                            : running
                              ? "running"
                              : "idle";

                return (
                  <div key={item.key}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      disabled={!expandable}
                      onClick={() => toggle(item.key)}
                      className="group/row relative flex min-h-7 w-full items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-left transition-colors duration-150 hover:bg-hover disabled:cursor-default disabled:hover:bg-transparent"
                      style={{
                        animation: `fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${index * 90}ms both`,
                      }}
                    >
                      <Connector />
                      <AgentGlyph state={state} />
                      <span className="min-w-0 shrink-0 truncate text-[12.5px] font-medium text-ink">
                        {item.label}
                      </span>
                      {tools.length > 0 ? (
                        <span className="min-w-0 truncate text-[11.5px] text-ink-3">
                          {tools.length} {tools.length === 1 ? "tool" : "tools"}
                        </span>
                      ) : null}
                      {expandable ? (
                        <span className="ml-auto shrink-0 opacity-70">
                          <Chevron open={isOpen} size={11} />
                        </span>
                      ) : null}
                    </button>

                    {isOpen && expandable ? (
                      <div className="mb-0.5 ml-6 border-l border-line pl-3">
                        {text ? (
                          <p className="whitespace-pre-wrap text-[11.5px] leading-[1.6] text-ink-2">
                            {text}
                          </p>
                        ) : null}

                        {tools.length > 0 ? (
                          <div className="mt-1 flex flex-col gap-0.5">
                            {tools.map((tool, toolIndex) => {
                              const base = teamToolBase(tool.name);
                              const detail = detailFromTarget(base, tool.target);
                              const node =
                                detail?.kind === "file"
                                  ? pathIndex.get(detail.path)
                                  : undefined;
                              const openable = node?.type === "file";
                              const rowClass =
                                "group/row relative flex min-h-7 w-full items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-left transition-colors duration-150 hover:bg-hover";
                              const rowContent = (
                                <ToolRowContent
                                  label={TOOL_LABELS[base] ?? prettify(base)}
                                  running={false}
                                  failed={false}
                                  detail={detail}
                                  node={node}
                                />
                              );

                              return openable ? (
                                <button
                                  key={`${tool.name}-${toolIndex}`}
                                  type="button"
                                  onClick={() => onOpenFile(node!.id)}
                                  className={rowClass}
                                >
                                  {rowContent}
                                </button>
                              ) : (
                                <div
                                  key={`${tool.name}-${toolIndex}`}
                                  className={rowClass}
                                >
                                  {rowContent}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {failed && part.errorText ? (
                <div className="ml-6 border-l border-line pl-3">
                  <span className="text-[11.5px] leading-[1.6] text-red">
                    {part.errorText}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chevron({ open, size = 13 }: { open: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ink-3)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 transition-transform duration-300"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Connector() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -left-[13px] top-1/2 -translate-y-1/2 overflow-visible"
      width="13"
      height="14"
      viewBox="0 0 13 14"
      fill="none"
    >
      <path
        d="M0 9 C0 10.5 1.5 12 4 12 H13"
        stroke="var(--line)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type AgentState = "idle" | "running" | "done" | "error";

function AgentGlyph({ state }: { state: AgentState }) {
  if (state === "running") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center">
        <span
          className="size-3 rounded-full border-[1.5px] border-line-strong border-t-ink-2"
          style={{ animation: "spin 700ms linear infinite" }}
        />
      </span>
    );
  }

  return (
    <span className="flex size-4 shrink-0 items-center justify-center">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={state === "error" ? "text-red" : "text-ink-3"}
      >
        {state === "error" ? (
          <path d="M18 6L6 18M6 6l12 12" />
        ) : state === "done" ? (
          <path d="M20 6L9 17l-5-5" />
        ) : (
          <circle cx="12" cy="12" r="4" />
        )}
      </svg>
    </span>
  );
}

/**
 * Renders an `ask-user` tool call as an interactive decision card: the question,
 * its suggested options as buttons, and (optionally) a free-text field. Choosing
 * an answer sends it as the next user message via `onQuickReply` — this stack has
 * no agent suspend/resume, so clarification is turn-based.
 */
function AskUserCard({
  part,
  onQuickReply,
}: {
  part: ToolPart;
  onQuickReply?: (text: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const [answered, setAnswered] = useState<string | null>(null);

  const question = teamField(part.input, "question");
  const input = (part.input ?? {}) as Record<string, unknown>;
  const options = Array.isArray(input.options)
    ? input.options.filter((value): value is string => typeof value === "string")
    : [];
  const allowCustom = input.allowCustom !== false;

  if (!question) return null;

  const submit = (value: string) => {
    const text = value.trim();
    if (!text || answered || !onQuickReply) return;
    setAnswered(text);
    onQuickReply(text);
  };

  return (
    <div className="mb-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
      <p className="text-[12.5px] font-medium text-ink">{question}</p>

      {answered ? (
        <p className="mt-1.5 text-[11.5px] text-ink-3">
          You chose: <span className="text-ink-2">{answered}</span>
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => submit(option)}
              disabled={!onQuickReply}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink transition-colors hover:bg-hover-2 disabled:opacity-50"
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {allowCustom && !answered ? (
        <form
          className="mt-2 flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            submit(custom);
          }}
        >
          <input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="Type your own…"
            className="min-w-0 flex-1 rounded-full border border-line bg-field px-2.5 py-1 text-[11.5px] text-ink outline-none placeholder:text-ink-3 focus:border-primary/50"
          />
          <button
            type="submit"
            disabled={!custom.trim() || !onQuickReply}
            className="rounded-full bg-primary px-2.5 py-1 text-[11.5px] font-medium text-primary-foreground disabled:opacity-50"
          >
            Send
          </button>
        </form>
      ) : null}
    </div>
  );
}
