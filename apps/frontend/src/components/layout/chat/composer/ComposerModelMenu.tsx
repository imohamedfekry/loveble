"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { MODELS } from "./composer-data";
import type { ComposerModel } from "./types";

export function ComposerModelMenu({
  open,
  selected,
  hovered,
  modelBox,
  onHover,
  onSelect,
  onMouseLeave,
}: {
  open: boolean;
  selected: ComposerModel;
  hovered: number | null;
  modelBox: { top: number; height: number } | null;
  onHover: (index: number) => void;
  onSelect: (model: ComposerModel) => void;
  onMouseLeave: () => void;
}) {
  if (!open) return null;

  const selectedIndex = MODELS.findIndex(
    (model) => model.key === selected.key
  );

  return (
    <div
      onMouseLeave={onMouseLeave}
      className={cn(
        "absolute right-0 bottom-full z-30 mb-2 w-48",
        "rounded-xl border border-border bg-popover p-1",
        "shadow-2xl shadow-black/40",
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-150"
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1 rounded-lg bg-foreground/5"
        style={{
          top: modelBox?.top ?? 0,
          height: modelBox?.height ?? 0,
          opacity: modelBox && hovered !== null ? 1 : 0,
          transition:
            "top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease",
        }}
      />

      {MODELS.map((model, index) => (
        <button
          key={model.key}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => onHover(index)}
          onClick={() => onSelect(model)}
          className="relative z-10 flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left"
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