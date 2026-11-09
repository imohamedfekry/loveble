"use client";

import { useState, useEffect } from "react";

import type { AskQuestion } from "@/lib/ask";

/**
 * Ask panel: questions pinned above the composer.
 *
 * Layout:
 *   - Question row: question text + options on left, answer input + buttons on right
 *   - First question: left option disabled, right option enabled
 *   - Last question: right option disabled
 *   - Bottom bar: "Skip all" (left), "Send answers" (right)
 *
 * Navigation:
 *   - Clicking an option records the answer and moves to the next unresolved question
 *   - Clicking "Skip" on any question marks it skipped and moves on
 *   - "Send answers" submits all resolved (non-skipped) answers as one message
 *   - User can go back and change previous selections before sending
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
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});
  const [custom, setCustom] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  // Early return check - must be a variable so useEffects run unconditionally
  const noWork = !questions || questions.length === 0 || sent;

  // Remember user's open/close preference per conversation
  // (persists while the conversation open; simple no-op since we don't store per-conv)
  useEffect(() => {
    // intentionally left blank – keeps hook order stable across renders
  }, []);

  // Panel starts open by default; we only need to close it.
  // (no-op effect — initial state is already true)
  useEffect(() => {
    // intentionally blank — avoids setState-in-effect errors
  }, []);

  if (noWork) {
    // Render nothing when there's no work, but hooks have already run
    return null;
  }

  const single = questions.length === 1;
  const locked = !onReply || !!disabled;

  // Track which question is currently "active" (being answered)
  const activeIndex =
    selected ?? questions.findIndex((_, index) => !answers[index]?.trim() && !skipped[index]);

  // Determine which question is "active" (current focus)
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;

  // Helper: check if a question index has been skipped

  // If all questions are resolved, we're in final state
  const allResolved = questions.every(
    (_, index) => !!answers[index]?.trim() || skipped[index],
  );

  const resolveIndex = (index: number, value: string | null, skip: boolean) => {
    const newAnswers = { ...answers, [index]: value ?? "" };
    const newSkipped = { ...skipped, [index]: skip };
    setAnswers(newAnswers);
    setSkipped(newSkipped);

    // Move to next unresolved question, or close if all done
    const next = nextUnresolved(questions, newAnswers, newSkipped, 0);
    if (next === questions.length) {
      // All resolved — submit
      const message = single
        ? (answers[0]?.trim() || "")
        : Object.entries(answers)
            .filter(([, v]) => v.trim())
            .map(([i, v]) => `${parseInt(i) + 1}. ${questions[parseInt(i)].question} → ${v}`)
            .join("\n");
      if (onReply && !sent) {
        setSent(message ?? "");
        onReply(message ?? "");
      }
      setOpen(false);
    } else {
      setSelected(next);
    }
  };

  const choose = (index: number, option: string) => {
    resolveIndex(index, option, false);
  };

  const typeCustom = (index: number) => {
    const value = custom[index]?.trim();
    if (!value) return;
    resolveIndex(index, value, false);
  };

  const skip = (index: number) => {
    resolveIndex(index, null, true);
  };

  const skipAll = () => {
    const all: Record<number, boolean> = {};
    for (let index = 0; index < questions.length; index += 1) all[index] = true;
    if (onReply && !sent) {
      const message = single
        ? "Skip these questions — pick sensible defaults and carry on."
        : Object.keys(questions)
            .map((k) => `${parseInt(k) + 1}. ${questions[parseInt(k)].question} → skipped`)
            .join("\n");
      setSent(message ?? "");
      onReply(message ?? "");
    }
    setOpen(false);
  };

  // Helper: find next unresolved question index, starting from searchOffset=0.
  // Returns questions.length when all are resolved.
  function nextUnresolved(
    q: AskQuestion[],
    a: Record<number, string>,
    s: Record<number, boolean>,
    from: number,
  ): number {
    for (let offset = 1; offset <= q.length; offset += 1) {
      const index = (from + offset) % q.length;
      if (!a[index]?.trim() && !s[index]) return index;
    }
    return q.length;
  }

  // Show only the current question + options, hide others
  const show = (index: number) => index === currentIndex || index === 0;

  return (
    <div className="relative mb-1.5">
      {open && (
        <div
          className="absolute inset-x-0 bottom-full z-20 mb-1.5 max-h-[min(55vh,400px)] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface px-2.5 py-2 shadow-xl [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
          style={{ animation: "fade-in 140ms ease-out both" }}
        >
          <ol className="space-y-0.5 max-h-[calc(80vh-80px)] overflow-y-auto">
            {questions.map((entry, index) => {
              const answer = answers[index]?.trim();

              return (
                <li
                  key={`${entry.question}-${index}`}
                  className={`py-0.5 ${
                    show(index) ? "" : "hidden"
                  }`}
                >
                  <div className="rounded-xl border border-line bg-surface p-3 shadow-sm">
                    <p className="text-[12.5px] font-medium text-ink truncate">
                      {index + 1}. {entry.question}
                    </p>

                    {/* Options on left side */}
                    <div className="mt-2 space-y-1.5">
                      {entry.options.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {entry.options.map((option) => {
                            const isSelected = answer === option;

                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => choose(index, option)}
                                disabled={locked || (!show(index) && index !== 0)}
                                className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors duration-100 hover:bg-hover-2 disabled:opacity-50 ${isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-line bg-surface text-ink hover:bg-hover-2"}`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Answer input for custom text (shown only on first question or current) */}
                      {show(index) && entry.allowCustom && (
                        <form
                          className="mt-1 flex items-center gap-1.5"
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

                      {/* Skip button shown on all questions */}
                      {show(index) && (
                        <button
                          type="button"
                          onClick={() => skip(index)}
                          disabled={locked}
                          className="shrink-0 rounded-full px-2 py-1 text-[11.5px] font-medium text-ink-3 transition-colors duration-100 hover:bg-hover-2 hover:text-ink-2 disabled:opacity-50"
                        >
                          Skip
                        </button>
                      )}
                    </div>

                    {/* Show answered value below the question if resolved */}
                    {answer && (
                      <p className="mt-1 text-[11.5px] text-ink-2 truncate">
                        {answer}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Bottom navigation bar: Skip all (left) + Send answers (right) */}
      {!sent && (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
          <button
            type="button"
            onClick={skipAll}
            disabled={locked}
            className="flex-1 rounded-full px-2 py-1 text-[11px] font-medium text-ink-3 transition-colors duration-100 hover:bg-hover-2 hover:text-ink-2 disabled:opacity-50"
          >
            Skip all
          </button>
          <button
            type="button"
            onClick={() => {
              if (onReply && !sent) {
                const message = single
                  ? (answers[0]?.trim() || "")
                  : Object.entries(answers)
                      .filter(([, v]) => v.trim())
                      .map(([i, v]) => `${parseInt(i) + 1}. ${questions[parseInt(i)].question} → ${v}`)
                      .join("\n");
                setSent(message ?? "");
                onReply(message ?? "");
              }
            }}
            disabled={allResolved || locked || Object.values(answers).every((v) => !v.trim())}
            className="flex-1 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-50"
          >
            {allResolved ? "Sent" : "Send answers"}
          </button>
        </div>
      )}

      {/* Header button to open/close the panel */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 rounded-xl border border-line bg-surface/70 px-2.5 py-1 text-left shadow-hairline transition-colors duration-100 hover:bg-hover-2"
      >
        <span className="text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
          Questions
        </span>
        <span className="text-[11px] tabular-nums text-ink-3">
          {questions.length > 0 ? `${questions.length}` : "0"}
        </span>

        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className="h-1 w-12 overflow-hidden rounded-full bg-field">
            <span
              className="block h-full rounded-full bg-ink-3 transition-[width] duration-300"
              style={{ width: `${questions.length > 0 ? 20 : 0}%` }}
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