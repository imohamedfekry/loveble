"use client";

import { cn } from "@/lib/utils";

import { ComposerIcon } from "./ComposerIcon";
import type { ComposerSource } from "./types";
import { BRANDS, GLYPHS } from "./omposer-data-icons";

export function ComposerMenuItem({
  row,
  source,
  active,
  connected,
  onMouseDown,
  onMouseEnter,
  onClick,
  onConnect,
}: {
  row: {
    key: string;
    name: string;
    desc: string;
  };
  source?: ComposerSource;
  active: boolean;
  connected: boolean;
  onMouseDown: () => void;
  onMouseEnter: () => void;
  onClick: () => void;
  onConnect?: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown();
      }}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={cn(
        "relative z-10 flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left",
        "transition-colors duration-150",
        active && "bg-accent"
      )}
    >
      {source && (
        <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center text-muted-foreground">
          {source.brand ? (
            BRANDS[source.brand]
          ) : (
            <ComposerIcon size={15}>
              {GLYPHS[source.glyph ?? "clip"]}
            </ComposerIcon>
          )}
        </span>
      )}

      <span className="shrink-0 text-[12.5px] font-medium text-foreground">
        {row.name}
      </span>

      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {row.desc}
      </span>

      {source?.connect && (
        <span
          role="button"
          tabIndex={-1}
          onClick={(event) => {
            event.stopPropagation();
            onConnect?.();
          }}
          className={cn(
            "shrink-0 text-xs font-medium transition-colors",
            connected
              ? "text-emerald-400"
              : "text-blue-400 hover:underline"
          )}
        >
          {connected ? "Connected" : "Connect"}
        </span>
      )}
    </button>
  );
}