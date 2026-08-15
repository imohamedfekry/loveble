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
        "shadow-2xl shadow-black/40",
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-150"
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1 rounded-lg bg-foreground/5"
        style={{
          top: rowBox?.top ?? 0,
          height: rowBox?.height ?? 0,
          opacity: rowBox && engaged && rows.length > 0 ? 1 : 0,
          transition:
            "top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease",
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