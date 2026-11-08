"use client";

import { cn } from "@loveble/utils";

import { ComposerMenuItem } from "./ComposerMenuItem";
import { SOURCES } from "./composer-data";
import type { ComposerMenuType, ComposerRow } from "./types";

export function ComposerMenu({
  menu,
  rows,
  active,
  connected,
  onHover,
  onClick,
  onConnect,
}: {
  menu: ComposerMenuType;
  rows: ComposerRow[];
  active: number;
  connected: boolean;
  onHover: (index: number) => void;
  onClick: (row: ComposerRow) => void;
  onConnect: () => void;
}) {
  if (!menu) return null;

  return (
    <div
      role="listbox"
      aria-label={menu === "files" ? "Project files" : "Sources"}
      className={cn(
        "absolute inset-x-0 bottom-full z-30 mb-2 max-h-72 overflow-y-auto",
        "rounded-xl border border-border bg-muted p-1",
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-(--duration-quick) motion-reduce:animate-none"
      )}
    >
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
          {menu === "files" ? "No files found" : "No matches"}
        </div>
      )}

      <div className="mt-1 border-t border-border px-2 pb-1 pt-1.5 text-[11px] text-muted-foreground">
        {menu === "files"
          ? "Type a path to browse files"
          : "Type to search sources & files"}
      </div>
    </div>
  );
}
