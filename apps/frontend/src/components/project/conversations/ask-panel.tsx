"use client";

import { useState } from "react";

import { composeAskReply, type AskQuestion } from "@/lib/ask";

type StepState = "pending" | "active" | "done" | "skipped";

function StepGlyph({ state }: { state: StepState }) {
  if (state === "done") {
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
  if (state === "skipped") {
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
        className="shrink-0 text-ink-3"
      >
        <path d="M5 12h14" />
      </svg>
    );
  }
  if (state === "active") {
    return (
      <span className="mt-0.5 size-3.5 shrink-0 rounded-full border-[1.5px] border-ink-2 bg-ink" />
    );
  }
  return (
    <span className="mt-0.5 size-3.5 shrink-0 rounded-full border-[1.5px] border-line-strong" />
  );
}

function nextUnresolved(
  questions: AskQuestion[],
  answers: Record<number, string>,
  skipped: Record<number, boolean>,
  from: number,
) {
  for (let offset = 1; offset <= questions.length; offset += 1) {
    const index = (from + offset) % questions.length;
    if (!answers[index]?.trim() && !skipped[index]) return index;
  }
  return from;
}

/**
 * The agent's questions, pinned to the composer instead of living inside the
 * message thread (same shape as the plan panel): one row per question, the
 * current one opened with its options, and a skip on every step.
 *
 * Answering is still turn-based — the reply is sent as the next user message —
 * so the panel leaves as soon as that message is in the transcript.
 */
export function AskPanel({
  questions,
  conversationId,
  onReply,
  disabled,
}: {
  questions: AskQuestion[] | null;
  conversationId: bigint | null;
  onReply?: (text: string) => void;
  /** The turn is still streaming, so a reply would be dropped: keep it inert. */
  disabled?: boolean;
}) {
  const [override, setOverride] = useState<{
    conversation: bigint | null;
    open: boolean;
  } | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});
  const [custom, setCustom] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  if (!questions || questions.length === 0 || sent) return null;

  const single = questions.length === 1;
  const resolved = (index: number) =>
    !!answers[index]?.trim() || !!skipped[index];
  const resolvedCount = questions.reduce(
    (total, _, index) => total + (resolved(index) ? 1 : 0),
    0,
  );
  const activeIndex =
    selected ?? questions.findIndex((_, index) => !resolved(index));
  const remembered =
    override && override.conversation === conversationId ? override.open : null;
  const open = remembered ?? true;
  const percent = Math.round((resolvedCount / questions.length) * 100);
  const locked = !onReply || !!disabled;
  const currentQuestion = questions[activeIndex >= 0 ? activeIndex : 0];

  const submit = (
    finalAnswers: Record<number, string>,
    finalSkipped: Record<number, boolean>,
  ) => {
    if (locked || sent) return;
    const message = composeAskReply(questions, finalAnswers, finalSkipped);
    setSent(message);
    onReply?.(message);
  };

  const apply = (
    nextAnswers: Record<number, string>,
    nextSkipped: Record<number, boolean>,
    from: number,
  ) => {
    setAnswers(nextAnswers);
    setSkipped(nextSkipped);

    const allResolved = questions.every(
      (_, index) => !!nextAnswers[index]?.trim() || nextSkipped[index],
    );
    // A single question is a one-click decision, and a full set of answers is
    // ready to go: send both without an extra confirm.
    if (single || allResolved) {
      submit(nextAnswers, nextSkipped);
      return;
    }
    setSelected(nextUnresolved(questions, nextAnswers, nextSkipped, from));
  };

  const choose = (index: number, option: string) => {
    apply({ ...answers, [index]: option }, { ...skipped, [index]: false }, index);
  };

  const typeCustom = (index: number) => {
    const value = custom[index]?.trim();
    if (!value) return;
    apply({ ...answers, [index]: value }, { ...skipped, [index]: false }, index);
  };

  const skip = (index: number) => {
    apply({ ...answers, [index]: "" }, { ...skipped, [index]: true }, index);
  };

  const skipAll = () => {
    const all: Record<number, boolean> = {};
    for (let index = 0; index < questions.length; index += 1) all[index] = true;
    submit({}, all);
  };

  return (
    <div className="relative mb-1.5">
      {open && (
        <div
          className="absolute inset-x-0 bottom-full z-20 mb-1.5 max-h-[min(50vh,360px)] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface px-2.5 py-2 shadow-xl [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
          style={{ animation: "fade-in 140ms ease-out both" }}
        >
          <ol className="space-y-0.5">
            {questions.map((entry, index) => {
              const answer = answers[index]?.trim();
              const isSkipped = !!skipped[index];
              const isActive = index === activeIndex && !answer && !isSkipped;
              const state: StepState = answer
                ? "done"
                : isSkipped
                  ? "skipped"
                  : isActive
                    ? "active"
                    : "pending";

              return (
                <li key={`${entry.question}-${index}`} className="py-0.5">
                  <button
                    type="button"
                    onClick={() => setSelected(index)}
                    disabled={locked}
                    className="flex w-full items-start gap-2 text-left disabled:cursor-default"
                  >
                    <span className="pt-0.5">
                      <StepGlyph state={state} />
                    </span>
                    <span
                      className={
                        "min-w-0 flex-1 text-[12.5px] leading-snug " +
                        (answer
                          ? "text-ink-3 line-through"
                          : isSkipped
                            ? "text-ink-3 line-through"
                            : isActive
                              ? "font-medium text-ink"
                              : "text-ink-2")
                      }
                    >
                      {!single && (
                        <span className="mr-1.5 tabular-nums text-ink-3">
                          {index + 1}.
                        </span>
                      )}
                      {entry.question}
                    </span>
                    {answer && (
                      <span className="max-w-[45%] shrink-0 truncate text-[11.5px] text-ink-2">
                        {answer}
                      </span>
                    )}
                    {isSkipped && (
                      <span className="shrink-0 text-[11px] text-ink-3">
                        skipped
                      </span>
                    )}
                  </button>

                  {isActive && (
                    <div className="mt-1.5 mb-1 ml-[22px] space-y-1.5">
                      {entry.options.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {entry.options.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => choose(index, option)}
                              disabled={locked}
                              className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink transition-colors duration-100 hover:bg-hover-2 disabled:opacity-50"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        {entry.allowCustom && (
                          <form
                            className="flex min-w-0 flex-1 items-center gap-1.5"
                            onSubmit={(event) => {
                              event.preventDefault();
                              typeCustom(index);
                            }}
                          >
                            <input
                              value={custom[index] ?? ""}
                              onChange={(event) =>
                                setCustom((state) => ({
                                  ...state,
                                  [index]: event.target.value,
                                }))
                              }
                              disabled={locked}
                              placeholder="Type your own…"
                              className="min-w-0 flex-1 rounded-full border border-line bg-field px-2.5 py-1 text-[11.5px] text-ink outline-none placeholder:text-ink-3 focus:border-primary/50"
                            />
                            <button
                              type="submit"
                              disabled={!custom[index]?.trim() || locked}
                              className="rounded-full bg-primary px-2.5 py-1 text-[11.5px] font-medium text-primary-foreground disabled:opacity-50"
                            >
                              {single ? "Send" : "Use"}
                            </button>
                          </form>
                        )}
                        <button
                          type="button"
                          onClick={() => skip(index)}
                          disabled={locked}
                          className="shrink-0 rounded-full px-2 py-1 text-[11.5px] font-medium text-ink-3 transition-colors duration-100 hover:bg-hover-2 hover:text-ink-2 disabled:opacity-50"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {!single && (
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-1.5">
              <button
                type="button"
                onClick={skipAll}
                disabled={locked}
                className="rounded-full px-1.5 py-1 text-[11.5px] font-medium text-ink-3 transition-colors duration-100 hover:bg-hover-2 hover:text-ink-2 disabled:opacity-50"
              >
                Skip all
              </button>
              <button
                type="button"
                onClick={() => submit(answers, skipped)}
                disabled={resolvedCount === 0 || locked}
                className="rounded-full bg-primary px-3 py-1 text-[11.5px] font-medium text-primary-foreground disabled:opacity-50"
              >
                Send answers
              </button>
            </div>
          )}
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
          Questions
        </span>
        <span className="text-[11px] tabular-nums text-ink-3">
          {resolvedCount}/{questions.length}
        </span>

        {!open && currentQuestion && (
          <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">
            {currentQuestion.question}
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
