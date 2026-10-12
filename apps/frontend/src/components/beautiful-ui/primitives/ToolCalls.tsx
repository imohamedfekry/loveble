"use client";

import { useMemo, useState } from "react";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";

import { useEditor } from "@/lib/hooks/use-editor";
import { useFilesStore } from "@/store/file.store";
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

export function ToolCalls({
  parts,
  projectId,
  className,
}: {
  parts: ToolPart[];
  projectId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(true);
  const files = useFilesStore((state) => state.files[projectId] ?? EMPTY_FILES);
  const pathIndex = useMemo(() => buildPathIndex(files), [files]);
  const { openFile } = useEditor(projectId);

  // The team workflow tool is rendered as its own rich report (per-agent
  // output), not as a generic timeline row.
  const teamParts = useMemo(
    () => parts.filter((part) => toolBase(part) === TEAM_TOOL),
    [parts],
  );
  const timelineParts = useMemo(
    () => parts.filter((part) => toolBase(part) !== TEAM_TOOL),
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
        <TeamRunReport key={part.toolCallId ?? part.type} part={part} />
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
                  <>
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      {row.running ? (
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
                          className={row.failed ? "text-red" : "text-ink-3"}
                        >
                          {row.failed ? (
                            <path d="M18 6L6 18M6 6l12 12" />
                          ) : (
                            <path d="M20 6L9 17l-5-5" />
                          )}
                        </svg>
                      )}
                    </span>

                    <span className="min-w-0 shrink-0 truncate text-[12.5px] font-medium text-ink">
                      {row.label}
                    </span>

                    {row.detail?.kind === "file" && (
                      <span
                        className="inline-flex h-5.5 min-w-0 max-w-60 items-center gap-1 rounded-chip bg-field px-1.5 font-mono text-[11.5px] text-ink-2 shadow-hairline"
                        title={row.detail.path}
                      >
                        {row.detail.isFolder ? (
                          <FolderIcon
                            folderName={row.detail.name}
                            className="size-4 shrink-0"
                          />
                        ) : (
                          <FileIcon
                            fileName={row.detail.name}
                            autoAssign
                            className="size-4 shrink-0"
                          />
                        )}
                        <span className="truncate">{row.detail.name}</span>
                      </span>
                    )}

                    {row.detail?.kind === "code" && (
                      <span className="min-w-0 flex-1 truncate rounded-chip bg-field px-1.5 font-mono text-[11.5px] text-ink-2 shadow-hairline">
                        {row.detail.text}
                      </span>
                    )}

                    {row.detail?.kind === "search" && (
                      <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">
                        {row.detail.text}
                      </span>
                    )}

                    {canOpen && (
                      <span className="ml-auto shrink-0 text-[11px] text-ink-3 opacity-0 transition-opacity duration-150 group-hover/row:opacity-100">
                        Open
                      </span>
                    )}
                  </>
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

/**
 * Rich report for the `run-team-workflow` tool: the brief the supervisor handed
 * over plus what each specialist (design / review / builder) reported. Rendered
 * from the tool's own input/output, so it persists in the conversation — the
 * live `TeamRunMonitor` is only the transient progress view.
 */
function TeamRunReport({ part }: { part: ToolPart }) {
  const [open, setOpen] = useState(true);

  const running =
    part.state === "input-streaming" || part.state === "input-available";
  const failed = part.state === "output-error" || !!part.errorText;

  const request = teamField(part.input, "request");
  const sections = [
    { label: "Design", text: teamField(part.output, "design") },
    { label: "Review", text: teamField(part.output, "review") },
    { label: "Builder", text: teamField(part.output, "summary") },
  ].filter((section): section is { label: string; text: string } =>
    Boolean(section.text),
  );

  const heading = failed
    ? "Team run failed"
    : running
      ? "Team running"
      : "Team run";

  return (
    <div className="mb-2 rounded-xl border border-line bg-surface px-3 py-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
          {running ? (
            <span
              className="size-3 rounded-full border-[1.5px] border-line-strong border-t-ink-2"
              style={{ animation: "spin 700ms linear infinite" }}
            />
          ) : failed ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--red, #e5484d)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
          {heading}
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

      {open ? (
        <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
          {request ? (
            <ReportSection label="Brief" text={request} muted />
          ) : null}

          {sections.map((section) => (
            <ReportSection
              key={section.label}
              label={section.label}
              text={section.text}
            />
          ))}

          {failed && part.errorText ? (
            <ReportSection label="Error" text={part.errorText} error />
          ) : null}

          {running && !request && sections.length === 0 ? (
            <p className="text-[11.5px] text-ink-3">
              Specialists are working…
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReportSection({
  label,
  text,
  muted,
  error,
}: {
  label: string;
  text: string;
  muted?: boolean;
  error?: boolean;
}) {
  return (
    <section className="rounded-lg border border-line px-2 py-1.5">
      <h4 className="text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
        {label}
      </h4>
      <p
        className={`mt-0.5 whitespace-pre-wrap text-[11.5px] leading-relaxed ${
          error ? "text-red" : muted ? "text-ink-3" : "text-ink-2"
        }`}
      >
        {text}
      </p>
    </section>
  );
}
