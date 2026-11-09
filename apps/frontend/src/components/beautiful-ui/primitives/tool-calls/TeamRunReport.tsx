"use client";

import { useEffect, useState } from "react";

import {
  LoaderGrid,
  PATTERNS,
} from "@/components/beautiful-ui/primitives/LoadingState";
import type { ProjectFileType } from "@/lib/api/apis/files/types";
import { socket } from "@/lib/socket/socket";

import { TOOL_LABELS } from "./constants";
import { Chevron, AgentGlyph } from "./icons";
import { detailFromTarget } from "./tool-details";
import {
  EMPTY_LIVE,
  nextLive,
  teamField,
  teamTools,
  teamToolBase,
} from "./team-utils";
import { ToolRowContent } from "./ToolRowContent";
import { TreeBranch } from "./TreeBranch";
import type {
  AgentState,
  LivePhase,
  LiveState,
  TeamRunLiveEvent,
  TeamTool,
  ToolPart,
} from "./types";
import { prettify } from "./utils";

/**
 * The `run-team-workflow` tool rendered exactly like the tool timeline: a
 * "Team run" header that expands into nested agent rows (Brief / Design /
 * Review / Builder), each itself expandable to reveal that agent's output.
 * Reads the tool's own input/output so it persists in the conversation.
 */
export function TeamRunReport({
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
            <div className="flex flex-col py-1">
              {items.map((item, index) => {
                const liveText = running ? live.detail[item.phase] : undefined;
                const text = liveText ?? item.text ?? "";
                const liveTools = running ? live.tools[item.phase] : undefined;
                const tools =
                  liveTools && liveTools.length > 0 ? liveTools : item.tools;
                const liveStatus = running
                  ? live.status[item.phase]
                  : undefined;
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
                  <div key={item.key} className="relative pb-0.5">
                    <TreeBranch
                      first={index === 0}
                      last={index === items.length - 1}
                    />

                    <button
                      type="button"
                      aria-expanded={isOpen}
                      disabled={!expandable}
                      onClick={() => toggle(item.key)}
                      className="group/row relative flex min-h-7 w-full items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-left transition-colors duration-150 hover:bg-hover disabled:cursor-default disabled:hover:bg-transparent"
                      style={{
                        animation: `fade-in 320ms ease-out ${index * 90}ms both`,
                      }}
                    >
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
                              const detail = detailFromTarget(
                                base,
                                tool.target,
                              );
                              const node =
                                detail?.kind === "file"
                                  ? pathIndex.get(detail.path)
                                  : undefined;
                              const openable = node?.type === "file";
                              const rowClass =
                                "group/row relative flex min-h-7 w-full items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-left transition-colors duration-150 hover:bg-hover";
                              const rowContent = (
                                <ToolRowContent
                                  base={base}
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
