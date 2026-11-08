import type { AgentState } from "./types";

export function Chevron({ open, size = 13 }: { open: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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
  );
}

export function AgentGlyph({ state }: { state: AgentState }) {
  if (state === "running") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center">
        <span
          className="size-3 rounded-full border-[1.5px] border-line-strong border-t-ink-2"
          style={{ animation: "spin 700ms linear infinite" }}
        />
      </span>
    );
  }

  return (
    <span className="flex size-4 shrink-0 items-center justify-center">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={state === "error" ? "text-red" : "text-ink-3"}
      >
        {state === "error" ? (
          <path d="M18 6L6 18M6 6l12 12" />
        ) : state === "done" ? (
          <path d="M20 6L9 17l-5-5" />
        ) : (
          <circle cx="12" cy="12" r="4" />
        )}
      </svg>
    </span>
  );
}
