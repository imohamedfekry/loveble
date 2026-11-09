"use client";

import { useLayoutEffect, useRef } from "react";

import { cn } from "@loveble/utils";

import { ComposerMenuItem } from "./ComposerMenuItem";
import { SOURCES } from "./composer-data";
import type { ComposerMenuType, ComposerRow } from "./types";

/** Keeps the keyboard-highlighted row inside the scroll viewport. */
function scrollRowIntoView(list: HTMLDivElement | null, index: number) {
  if (!list) return;

  const item = list.querySelector<HTMLElement>(`[data-row="${index}"]`);

  if (!item) return;

  const listRect = list.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const top = itemRect.top - listRect.top;
  const bottom = top + itemRect.height;

  if (top < 0) {
    list.scrollTop += top - 4;
  } else if (bottom > list.clientHeight) {
    list.scrollTop += bottom - list.clientHeight + 4;
  }
}

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
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    scrollRowIntoView(listRef.current, active);
  }, [active, rows]);

  if (!menu) return null;

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-full z-30 mb-2 overflow-hidden",
        "rounded-xl border border-border/50 bg-muted shadow-lg ring-1 ring-black/[0.04]",
        "dark:border-white/10 dark:ring-white/10",
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-(--duration-quick) motion-reduce:animate-none"
      )}
    >
      <div
        ref={listRef}
        role="listbox"
        aria-label={menu === "files" ? "Project files" : "Sources"}
        className={cn(
          "max-h-72 overflow-y-auto overscroll-contain p-1",
          "[scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]",
          "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:bg-clip-padding",
          "[&::-webkit-scrollbar-thumb:hover]:bg-foreground/25"
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
              index={index}
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
          <div className="px-2 py-2 text-[12.5px] text-muted-foreground">
            {menu === "files" ? "No files found" : "No matches"}
          </div>
        )}
      </div>

      <div className="border-t border-border/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
        {menu === "files"
          ? "Type a path to browse files"
          : "Type to search sources & files"}
      </div>
    </div>
  );
}
