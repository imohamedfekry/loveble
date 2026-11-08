"use client";

import { useState } from "react";

import { teamField } from "./team-utils";
import type { ToolPart } from "./types";

/**
 * Renders an `ask-user` tool call as an interactive decision card: the question,
 * its suggested options as buttons, and (optionally) a free-text field. Choosing
 * an answer sends it as the next user message via `onQuickReply` — this stack has
 * no agent suspend/resume, so clarification is turn-based.
 */
export function AskUserCard({
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
    ? input.options.filter(
        (value): value is string => typeof value === "string",
      )
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
