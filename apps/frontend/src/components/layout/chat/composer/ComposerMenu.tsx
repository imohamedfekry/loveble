"use client";

import { cn } from "@/lib/utils";

import { ComposerMenuItem } from "./ComposerMenuItem";
import { SOURCES } from "./composer-data";
import type { ComposerMenuType, ComposerRow } from "./types";

export function ComposerMenu({
  menu,
  rows,
  active,
  engaged,
  connected,
  rowBox,
  onHover,
  onClick,
  onConnect,
  onMouseLeave,
}: {
  menu: ComposerMenuType;
  rows: ComposerRow[];
  active: number;
  engaged: boolean;
  connected: boolean;
  rowBox: { top: number; height: number } | null;
  onHover: (index: number) => void;
  onClick: (row: ComposerRow) => void;
  onConnect: () => void;
  onMouseLeave: () => void;
}) {
  if (!menu) return null;

  return (
    <div
      onMouseLeave={onMouseLeave}
      className={cn(
        "absolute inset-x-0 bottom-full z-30 mb-2",
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
          top: rowBox?.top ?? 0,
          height: rowBox?.height ?? 0,
          opacity: rowBox && engaged && rows.length > 0 ? 1 : 0,
          transition:
            "top var(--duration-fast) var(--ease-smooth-out), height var(--duration-fast) var(--ease-smooth-out), opacity var(--duration-quick) var(--ease-smooth-out)",
        }}
      />

      {rows.map((row, index) => {
        const source =
          menu === "at"
            ? SOURCES.find((item) => item.key === row.key)
            : undefined;

        return (
          <ComposerMenuItem
            key={row.key}
            row={row}
            source={source}
            active={index === active}
            connected={connected}
            onMouseDown={() => {}}
            onMouseEnter={() => onHover(index)}
            onClick={() => onClick(row)}
            onConnect={onConnect}
          />
        );
      })}

      {rows.length === 0 && (
        <div className="flex h-9 items-center px-2 text-xs text-muted-foreground">
          No matches
        </div>
      )}

      <div className="mt-1 border-t border-border px-2 pb-1 pt-1.5 text-[11px] text-muted-foreground">
        {menu === "at"
          ? "Type to search sources & files"
          : "Type to search commands"}
      </div>
    </div>
  );
}