"use client";

import { useEffect, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";

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
  /** Per-agent summaries: what each specialist reported doing / commenting on. */
  details: Partial<Record<TrackedPhase, string>>;
  outcome: "running" | "done" | "error";
  detail?: string;
};

const PHASES: TrackedPhase[] = ["prepare", "design", "review", "builder"];

const LABELS: Record<TrackedPhase, string> = {
  prepare: "Brief",
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
  details: {},
  outcome: "running",
  detail: undefined,
};

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
    details: event.detail
      ? { ...base.details, [event.phase]: event.detail }
      : base.details,
  };
}

/**
 * Live progress panel for a `team-run` workflow. Shows which specialists are
 * working (in parallel) plus, per agent, what each one did or commented on.
 * Listens to the `team:run` socket channel and hides itself a while after the
 * run settles.
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

  // The panel no longer auto-hides: it stays until the user dismisses it (or the
  // project/conversation changes), so a finished run can always be inspected.

  if (!run.runId) return null;

  const heading =
    run.outcome === "error"
      ? "Team run failed"
      : run.outcome === "done"
        ? "Team run finished"
        : "Team running";

  const reported = PHASES.filter((phase) => Boolean(run.details[phase]));

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
        <span className="flex items-center gap-2">
          <span className="text-[11px] text-ink-3">
            team-run · {run.runId.slice(0, 8)}
          </span>
          <button
            type="button"
            onClick={() => setRun(IDLE)}
            aria-label="Dismiss team run"
            className="rounded p-0.5 text-ink-3 transition-colors hover:text-ink"
          >
            <XIcon className="size-3" />
          </button>
        </span>
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

      {run.outcome === "error" && run.detail ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-destructive">
          {run.detail}
        </p>
      ) : null}

      {reported.length > 0 ? (
        <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
          {reported.map((phase) => (
            <AgentReport
              key={phase}
              label={LABELS[phase]}
              state={run.phases[phase]}
              text={run.details[phase] ?? ""}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AgentReport({
  label,
  state,
  text,
}: {
  label: string;
  state: PhaseState;
  text: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg border border-line bg-transparent px-2 py-1.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span
          className={`flex items-center gap-1.5 text-[11px] font-medium ${
            state === "done" ? "text-ink-3 line-through" : "text-ink"
          }`}
        >
          <PhaseGlyph state={state} />
          {label}
        </span>
        <ChevronDownIcon
          className={`size-3 text-ink-3 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open ? (
        <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-ink-2">
          {text}
        </p>
      ) : null}
    </div>
  );
}

function PhaseGlyph({ state }: { state: PhaseState }) {
  if (state === "running") {
    return <Loader2Icon className="size-3 animate-spin text-primary" />;
  }
  if (state === "done") {
    return <CheckIcon className="size-3 text-primary" />;
  }
  if (state === "error") {
    return <XIcon className="size-3 text-destructive" />;
  }
  return <span className="size-1.5 rounded-full bg-ink-3" />;
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
      <span className={state === "done" ? "line-through" : undefined}>
        {label}
      </span>
    </span>
  );
}
