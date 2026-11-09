"use client";

import { useState } from "react";

import {
  planProgress,
  type ConversationPlan,
  type PlanStepStatus,
} from "@/lib/plan";

function StepGlyph({ status }: { status: PlanStepStatus }) {
  if (status === "active") {
    return (
      <span className="size-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-line-strong border-t-ink-2" />
    );
  }
  if (status === "done") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-ink-3"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  if (status === "blocked") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-red"
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    );
  }
  return (
    <span className="size-3.5 shrink-0 rounded-full border-[1.5px] border-line-strong" />
  );
}

/**
 * The plan the agent is working through, pinned to the composer instead of
 * living inside the message thread. It is conversation state on the server, so
 * it survives a reload; the only way to change it is the agent's `update-plan`
 * tool.
 *
 * Only the one-line header sits in the layout. The expanded list is an overlay
 * that grows upward over the message thread, so opening the plan never resizes
 * the chat or moves it while you are reading.
 *
 * Collapsing is per conversation and remembered while the chat is open. A
 * finished plan leaves the composer entirely: once every step is done the
 * panel renders nothing, and only a later `update-plan` from the agent (a new
 * plan) brings it back.
 */
export function PlanPanel({
  plan,
  conversationId,
}: {
  plan: ConversationPlan | null;
  conversationId: bigint | null;
}) {
  const [override, setOverride] = useState<{
    conversation: bigint | null;
    open: boolean;
  } | null>(null);

  if (!plan || plan.steps.length === 0) return null;

  const progress = planProgress(plan);

  // Nothing to work through any more, so the bar gets out of the way instead
  // of sitting above the composer for the rest of the conversation.
  if (progress.complete) return null;

  const remembered =
    override && override.conversation === conversationId ? override.open : null;
  const open = remembered ?? true;
  const percent = Math.round((progress.done / progress.total) * 100);
  const active = plan.steps.find((step) => step.status === "active");

  return (
    <div className="relative mb-1.5">
      {open && (
        <div
          className="absolute inset-x-0 bottom-full z-20 mb-1.5 max-h-[min(45vh,320px)] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface px-2.5 py-2 shadow-xl [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
          style={{ animation: "fade-in 140ms ease-out both" }}
        >
          {plan.title && (
            <p className="mb-1 truncate text-[12.5px] font-medium text-ink">
              {plan.title}
            </p>
          )}
          <ol className="space-y-0.5">
            {plan.steps.map((step, index) => (
              <li
                key={`${step.title}-${index}`}
                className="flex items-start gap-2 py-0.5"
              >
                <span className="pt-0.5">
                  <StepGlyph status={step.status} />
                </span>
                <span
                  className={
                    "min-w-0 text-[12.5px] leading-snug " +
                    (step.status === "done"
                      ? "text-ink-3 line-through"
                      : step.status === "active"
                        ? "font-medium text-ink"
                        : "text-ink-2")
                  }
                >
                  {step.title}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <button
        type="button"
        aria-expanded={open}
        onClick={() =>
          setOverride({ conversation: conversationId, open: !open })
        }
        className="flex w-full items-center gap-1.5 rounded-xl border border-line bg-surface/70 px-2.5 py-1 text-left shadow-hairline transition-colors duration-100 hover:bg-hover-2"
      >
        <span className="text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
          Plan
        </span>
        <span className="text-[11px] tabular-nums text-ink-3">
          {progress.done}/{progress.total}
        </span>
        {progress.blocked && (
          <span className="text-[11px] text-red">blocked</span>
        )}

        {!open && active && (
          <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">
            {active.title}
          </span>
        )}

        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className="h-1 w-12 overflow-hidden rounded-full bg-field">
            <span
              className="block h-full rounded-full bg-ink-3 transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ink-3)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 transition-transform duration-300"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
    </div>
  );
}
