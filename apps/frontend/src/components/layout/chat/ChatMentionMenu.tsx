"use client";

import { FileCode2 } from "lucide-react";

import { cn } from "@/lib/utils";

import type { MentionFile } from "./types";

export function ChatMentionMenu({
  open,
  items,
  activeIndex,
  onHover,
  onSelect,
}: {
  open: boolean;
  items: MentionFile[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (path: string) => void;
}) {
  if (!open || items.length === 0) return null;

  return (
    <div
      className={cn(
        "absolute bottom-full left-0 z-20 mb-2 w-full max-w-sm overflow-hidden rounded-xl",
        "border border-neutral-800 bg-[#1a1a20] shadow-xl shadow-black/40",
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-(--duration-quick) ease-out"
      )}
    >
      <div className="border-b border-white/6 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
        Mention a file
      </div>

      <ul className="max-h-48 overflow-y-auto p-1">
        {items.map((item, index) => (
          <li key={item.path}>
            <button
              type="button"
              data-composer-control
              onMouseEnter={() => onHover(index)}
              onClick={() => onSelect(item.path)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left",
                "transition-colors duration-(--duration-quick) ease-out",
                index === activeIndex
                  ? "bg-neutral-800 text-neutral-100"
                  : "text-neutral-300 hover:bg-neutral-800/70"
              )}
            >
              <FileCode2 className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
              <span className="truncate text-xs text-neutral-500">{item.path}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
