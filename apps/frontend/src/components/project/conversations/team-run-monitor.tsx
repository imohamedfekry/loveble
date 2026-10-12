"use client";

import { useEffect, useState } from "react";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";

import { socket } from "@/lib/socket/socket";

type TeamRunPhase = "prepare" | "design" | "review" | "builder" | "done";
type TeamRunStatus = "start" | "done" | "error";
type PhaseState = "idle" | "running" | "done" | "error";
type TrackedPhase = Exclude<TeamRunPhase, "done">;

type TeamRunEvent = {
  runId: string;
  projectId?: string;
  phase: TeamRunPhase;
  status: TeamRunStatus;
  detail?: string;
  files?: string[];
};

type RunState = {
  runId: string | null;
  phases: Record<TrackedPhase, PhaseState>;
  outcome: "running" | "done" | "error";
  detail?: string;
};

const PHASES: TrackedPhase[] = ["prepare", "design", "review", "builder"];

const LABELS: Record<TrackedPhase, string> = {
  prepare: "Preparing",
  design: "Design",
  review: "Review",
  builder: "Builder",
};

const STATUS_STATE: Record<TeamRunStatus, PhaseState> = {
  start: "running",
  done: "done",
  error: "error",
};

const IDLE: RunState = {
  runId: null,
  phases: {
    prepare: "idle",
    design: "idle",
    review: "idle",
    builder: "idle",
  },
  outcome: "running",
  detail: undefined,
};

const HIDE_AFTER_MS = 8000;

function reduce(prev: RunState, event: TeamRunEvent): RunState {
  // A different run id means the previous run is irrelevant — start over.
  const base =
    prev.runId === event.runId ? prev : { ...IDLE, runId: event.runId };

  if (event.phase === "done") {
    return {
      ...base,
      outcome: event.status === "error" ? "error" : "done",
      detail: event.detail,
    };
  }

  return {
    ...base,
    phases: { ...base.phases, [event.phase]: STATUS_STATE[event.status] },
  };
}

/**
 * Live progress bar for a `team-run` workflow: shows which specialists are
 * working, in parallel, on the current project. Listens to the `team:run`
 * socket channel and hides itself a few seconds after the run settles.
 */
export function TeamRunMonitor({ projectId }: { projectId: string }) {
  const [run, setRun] = useState<RunState>(IDLE);

  useEffect(() => {
    const onTeamRun = (event: TeamRunEvent) => {
      if (event.projectId && event.projectId !== projectId) return;
      setRun((prev) => reduce(prev, event));
    };
    socket.on("team:run", onTeamRun);
    return () => {
      socket.off("team:run", onTeamRun);
    };
  }, [projectId]);

  useEffect(() => {
    if (!run.runId || run.outcome === "running") return;
    const timer = setTimeout(() => setRun(IDLE), HIDE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [run]);

  if (!run.runId) return null;

  const heading =
    run.outcome === "error"
      ? "Team run failed"
      : run.outcome === "done"
        ? "Team run finished"
        : "Team running";

  return (
    <div className="mb-2 rounded-xl border border-line bg-surface px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
          {run.outcome === "running" ? (
            <Loader2Icon className="size-3 animate-spin text-primary" />
          ) : run.outcome === "error" ? (
            <XIcon className="size-3 text-destructive" />
          ) : (
            <CheckIcon className="size-3 text-primary" />
          )}
          {heading}
        </span>
        <span className="text-[11px] text-ink-3">team-run · {run.runId.slice(0, 8)}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {PHASES.map((phase) => (
          <PhaseChip
            key={phase}
            label={LABELS[phase]}
            state={run.phases[phase]}
          />
        ))}
      </div>

      {run.detail ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-2">
          {run.detail}
        </p>
      ) : null}
    </div>
  );
}

function PhaseChip({ label, state }: { label: string; state: PhaseState }) {
  const tone = {
    idle: "border-line bg-transparent text-ink-3",
    running: "border-primary/40 bg-primary/10 text-primary",
    done: "border-primary/30 bg-primary/5 text-primary",
    error: "border-destructive/40 bg-destructive/10 text-destructive",
  }[state];

  const icon =
    state === "running" ? (
      <Loader2Icon className="size-3 animate-spin" />
    ) : state === "done" ? (
      <CheckIcon className="size-3" />
    ) : state === "error" ? (
      <XIcon className="size-3" />
    ) : (
      <span className="size-1.5 rounded-full bg-current" />
    );

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}
    >
      {icon}
      {label}
    </span>
  );
}
