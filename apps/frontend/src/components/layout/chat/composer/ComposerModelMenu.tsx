"use client";

import type { MutableRefObject } from "react";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { MODELS } from "./composer-data";
import type { ComposerModel } from "./types";

export function ComposerModelMenu({
  open,
  selected,
  hovered,
  modelBox,
  rowRefs,
  onHover,
  onSelect,
  onMouseLeave,
}: {
  open: boolean;
  selected: ComposerModel;
  hovered: number | null;
  modelBox: { top: number; height: number } | null;
  rowRefs: MutableRefObject<(HTMLButtonElement | null)[]>;
  onHover: (index: number) => void;
  onSelect: (model: ComposerModel) => void;
  onMouseLeave: () => void;
}) {
  if (!open) return null;

  return (
    <div
      onMouseLeave={onMouseLeave}
      className={cn(
        "absolute right-0 bottom-full z-30 mb-2 w-48",
        "rounded-xl border border-border bg-popover p-1",
        "shadow-[0_1px_2px_rgba(0,0,0,0.08),0_8px_24px_-8px_rgba(0,0,0,0.24)]",
        "dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_8px_24px_-8px_rgba(0,0,0,0.7)]",
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-(--duration-quick) motion-reduce:animate-none"
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1 rounded-lg bg-foreground/10 dark:bg-foreground/15"
        style={{
          top: modelBox?.top ?? 0,
          height: modelBox?.height ?? 0,
          opacity: modelBox && hovered !== null ? 1 : 0,
          transition:
            "top var(--duration-fast) var(--ease-smooth-out), height var(--duration-fast) var(--ease-smooth-out), opacity var(--duration-quick) var(--ease-smooth-out)",
        }}
      />

      {MODELS.map((model, index) => (
        <button
          key={model.key}
          ref={(node) => {
            rowRefs.current[index] = node;
          }}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => onHover(index)}
          onClick={() => onSelect(model)}
          className="relative z-10 flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left transition-[background-color,color] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none hover:bg-foreground/10 dark:hover:bg-foreground/15 focus-visible:outline-none focus-visible:bg-foreground/10 dark:focus-visible:bg-foreground/15"
        >
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
            {model.name}
          </span>

          <span className="shrink-0 text-[11px] text-muted-foreground">
            {model.tag}
          </span>

          <Check
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              model.key === selected.key
                ? "text-foreground"
                : "invisible"
            )}
          />
        </button>
      ))}
    </div>
  );
}