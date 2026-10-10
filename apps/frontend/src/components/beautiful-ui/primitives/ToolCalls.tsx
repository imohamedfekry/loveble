"use client";

import { useState } from "react";

export type ToolPart = {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

const TOOL_LABELS: Record<string, string> = {
  "web-search": "Web search",
  "web-crawl": "Web crawl",
};

function resolveName(part: ToolPart): string {
  const raw =
    part.toolName ??
    (part.type.startsWith("tool-") ? part.type.slice(5) : part.type);
  return TOOL_LABELS[raw] ?? raw;
}

function resolveState(state?: string): {
  label: string;
  tone: "pending" | "done" | "error";
} {
  switch (state) {
    case "input-streaming":
      return { label: "Preparing", tone: "pending" };
    case "input-available":
      return { label: "Running", tone: "pending" };
    case "output-available":
      return { label: "Done", tone: "done" };
    case "output-error":
      return { label: "Failed", tone: "error" };
    default:
      return { label: "Tool", tone: "done" };
  }
}

function summarize(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    const json = JSON.stringify(value);
    return json.length > 120 ? `${json.slice(0, 120)}…` : json;
  } catch {
    return String(value);
  }
}

function queryFromInput(input: unknown): string {
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    for (const key of ["query", "url", "q", "prompt", "text"]) {
      const value = record[key];
      if (typeof value === "string") return value;
    }
  }
  return summarize(input);
}

export function ToolCalls({
  parts,
  className,
}: {
  parts: ToolPart[];
  className?: string;
}) {
  const [open, setOpen] = useState(true);
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());

  if (parts.length === 0) return null;

  const header = `${parts.length} tool ${parts.length === 1 ? "call" : "calls"}`;

  const toggleRow = (id: string) =>
    setOpenRows((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="-mx-1.5 flex w-fit items-center gap-1.5 rounded-control px-1.5 py-1 text-[12.5px] text-ink-2 transition-colors duration-100 hover:bg-hover-2"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-200"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span className="tabular-nums">{header}</span>
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
      >
        <div className="-mx-1 overflow-hidden px-1.5 pb-1">
          <div className="mt-1.5 flex flex-col gap-1">
            {parts.map((part) => {
              const id = part.toolCallId ?? resolveName(part);
              const { label, tone } = resolveState(part.state);
              const rowOpen = openRows.has(id);
              const failed = part.state === "output-error" || !!part.errorText;
              const detail = failed
                ? "The tool couldn't run this time. Please try again."
                : summarize(part.output);
              const query = queryFromInput(part.input);
              return (
                <div
                  key={id}
                  style={{
                    animation: "fade-up 300ms cubic-bezier(0.23,1,0.32,1) both",
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={rowOpen}
                    onClick={() => toggleRow(id)}
                    className="group/row -mx-[3px] flex h-7 w-[calc(100%+6px)] min-w-0 items-center gap-2 rounded-control px-[3px] text-left transition-colors duration-100 hover:bg-hover-2"
                  >
                    <span className="relative flex size-4 shrink-0 items-center justify-center text-ink-3">
                      {tone === "pending" ? (
                        <span
                          className="size-3 rounded-full border-[1.5px] border-line-strong border-t-ink-2"
                          style={{ animation: "spin 700ms linear infinite" }}
                        />
                      ) : (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={tone === "error" ? "text-red" : "text-green"}
                        >
                          {tone === "error" ? (
                            <path d="M18 6L6 18M6 6l12 12" />
                          ) : (
                            <path d="M20 6L9 17l-5-5" />
                          )}
                        </svg>
                      )}
                    </span>
                    <span className="shrink-0 text-[12.5px] font-medium text-ink">
                      {resolveName(part)}
                    </span>
                    {query && (
                      <span className="inline-flex h-5.5 min-w-0 flex-1 items-center truncate rounded-chip bg-field px-1.5 text-[11.5px] text-ink-2 shadow-hairline">
                        {query}
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-[11px] text-ink-3">
                      {label}
                    </span>
                  </button>

                  {detail && (
                    <div
                      className="grid transition-[grid-template-rows,opacity] duration-300"
                      style={{
                        gridTemplateRows: rowOpen ? "1fr" : "0fr",
                        opacity: rowOpen ? 1 : 0,
                        transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)",
                      }}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="mt-0.5 mb-1 ml-2 flex flex-col gap-0.5 border-l border-line py-0.5 pl-3.5">
                          <span
className={`text-[11.5px] leading-[1.6] ${
                                failed ? "text-red" : "text-ink-2"
                              }`}
                          >
                            {detail}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
