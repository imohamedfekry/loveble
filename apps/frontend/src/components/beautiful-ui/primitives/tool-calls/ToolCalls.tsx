"use client";

import { useMemo, useState } from "react";

import {
  LoaderGrid,
  PATTERNS,
} from "@/components/beautiful-ui/primitives/LoadingState";
import { useEditor } from "@/lib/hooks/use-editor";
import type { ProjectFileType } from "@/lib/api/apis/files/types";
import { useFilesStore } from "@/store/file.store";

import { ASK_TOOL, MEMORY_TOOLS, PLAN_TOOL, TEAM_TOOL } from "./constants";
import { Chevron } from "./icons";
import { buildPathIndex } from "./path-index";
import { detailFor, sectionsFor, summarize } from "./tool-details";
import { TeamRunReport } from "./TeamRunReport";
import { ToolRowContent } from "./ToolRowContent";
import { TreeBranch } from "./TreeBranch";
import type { ToolPart } from "./types";
import { labelFor, toolBase } from "./utils";

const EMPTY_FILES: ProjectFileType[] = [];

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string, current: boolean) =>
    setExpanded((state) => ({ ...state, [id]: !current }));
  const files = useFilesStore((state) => state.files[projectId] ?? EMPTY_FILES);
  const pathIndex = useMemo(() => buildPathIndex(files), [files]);
  const { openFile } = useEditor(projectId);

  // The team workflow tool gets a bespoke report, not a generic row.
  const teamParts = useMemo(
    () => parts.filter((part) => toolBase(part) === TEAM_TOOL),
    [parts],
  );
  // The plan and the agent's questions are conversation state rendered above
  // the composer, not rows in this timeline, so they are filtered out of it.
  const timelineParts = useMemo(
    () =>
      parts.filter((part) => {
        const base = toolBase(part);
        return base !== TEAM_TOOL && base !== ASK_TOOL && base !== PLAN_TOOL;
      }),
    [parts],
  );

  const rows = useMemo(
    () =>
      timelineParts.map((part, index) => {
        const base = toolBase(part);
        const running =
          part.state === "input-streaming" || part.state === "input-available";
        const failed = part.state === "output-error" || !!part.errorText;
        const detail = detailFor(base, part.input);
        const node =
          detail?.kind === "file" ? pathIndex.get(detail.path) : undefined;

        return {
          id: part.toolCallId ?? `${base}-${index}`,
          base,
          label: labelFor(part, base),
          running,
          failed,
          detail,
          node,
          details: sectionsFor(base, part.input, part.output),
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

      {timelineParts.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="-mx-1.5 flex w-fit max-w-full items-center gap-1.5 rounded-control px-1.5 py-1 transition-colors duration-100 hover:bg-hover-2"
          >
            <span role="status" className="flex items-center gap-1.5">
              {running ? (
                <>
                  <LoaderGrid {...PATTERNS.Heart} />
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
                </>
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
                <div className="flex flex-col py-1">
                  {rows.map((row, i) => {
                    const canOpen = row.node?.type === "file";
                    const memoryRow = MEMORY_TOOLS.has(row.base);
                    const isExpanded = expanded[row.id] ?? memoryRow;

                    const rowStyle = {
                      animation: `fade-in 320ms ease-out ${i * 90}ms both`,
                    };

                    const content = (
                      <ToolRowContent
                        base={row.base}
                        label={row.label}
                        running={row.running}
                        failed={row.failed}
                        detail={row.detail}
                        node={row.node}
                      />
                    );

                    const rowClass =
                      "group/row relative flex min-h-7 w-full items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-left transition-colors duration-150 hover:bg-hover";

                    const isLast = i === rows.length - 1;

                    return (
                      <div key={row.id} className="relative pb-0.5">
                        <TreeBranch first={i === 0} last={isLast} />

                        <div className={rowClass} style={rowStyle}>
                          {canOpen ? (
                            <button
                              type="button"
                              onClick={() =>
                                openFile(row.node!.id, { pinned: false })
                              }
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            >
                              {content}
                            </button>
                          ) : row.details.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(row.id, isExpanded)}
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            >
                              {content}
                            </button>
                          ) : (
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              {content}
                            </div>
                          )}

                          {row.details.length > 0 && (
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              aria-label={
                                isExpanded ? "Hide details" : "Show details"
                              }
                              onClick={() => toggleExpanded(row.id, isExpanded)}
                              className="-mr-0.5 grid size-6 shrink-0 place-items-center rounded-[4px] text-ink-3 transition-colors duration-100 hover:bg-hover-2 hover:text-ink-2"
                            >
                              <Chevron open={isExpanded} size={11} />
                            </button>
                          )}
                        </div>

                        {isExpanded && row.details.length > 0 && (
                          <div className="mb-1 ml-6 space-y-1.5 border-l border-line pl-3 pt-0.5">
                            {row.details.map((section, index) => (
                              <div key={`${section.label}-${index}`}>
                                <div
                                  className={`text-[10.5px] font-medium tracking-[0.05em] uppercase ${
                                    section.label === "Error"
                                      ? "text-red"
                                      : "text-ink-3"
                                  }`}
                                >
                                  {section.label}
                                </div>
                                <pre className="mt-0.5 max-h-56 overflow-auto rounded-md bg-field px-2 py-1.5 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap text-ink-2">
                                  {section.text}
                                </pre>
                              </div>
                            ))}
                          </div>
                        )}

                        {row.failed && row.errorText && (
                          <div className="ml-6 border-l border-line pl-3 pt-0.5">
                            <span className="text-[11.5px] leading-[1.6] text-red">
                              {row.errorText}
                            </span>
                          </div>
                        )}
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
