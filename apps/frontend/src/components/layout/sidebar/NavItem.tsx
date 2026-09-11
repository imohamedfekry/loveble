"use client";

import { cn } from "@/lib/utils";
import { CollapseLabel } from "./CollapseLabel";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import type { LucideIcon } from "lucide-react";
import { useModKeyLabel } from "@/lib/hooks/useModKeyLabel";

export function NavItem({
  icon,
  label,
  shortcut,
  active,
  open,
}: {
  icon: LucideIcon | IconSvgElement;
  label: string;
  shortcut?: string;
  active?: boolean;
  open: boolean;
}) {
  const Icon = icon as LucideIcon;
  const modKey = useModKeyLabel();

  return (
    <button
      type="button"
      title={label}
      onClick={(e) => {
        if (!open) e.stopPropagation();
      }}
      className={cn(
        "group relative flex h-8 w-full items-center rounded-lg p-0 ring-1",
        "text-[13.5px] font-[450] tracking-[-0.01em]",
        "transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0",

        !active &&
          cn(
            "ring-transparent text-muted-foreground",
            "hover:bg-foreground/[0.06] hover:text-sidebar-foreground hover:ring-border/50",
            "dark:hover:bg-white/[0.06] dark:hover:ring-white/10"
          ),

        active &&
          cn(
            "bg-foreground/[0.06] dark:bg-white/[0.06] ring-border/50 dark:ring-white/10 text-sidebar-foreground shadow-sm",
            "hover:bg-foreground/[0.08] dark:hover:bg-white/[0.08]"
          ),

        !open && "cursor-pointer"
      )}
    >
      {/* Icon — مربع 32×32 ثابت، في النص بالظبط بدون حركة */}
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">
        {Array.isArray(Icon) ? (
          <HugeiconsIcon icon={Icon} className="size-4 shrink-0" />
        ) : (
          <Icon className="size-4 shrink-0" />
        )}
      </span>

      {/* Label — يختفي بدون ما يحرك الأيقونة */}
      <span
        className={cn(
          "min-w-0 truncate text-left transition-opacity duration-200",
          open ? "flex-1 opacity-100 pr-1" : "w-0 flex-none overflow-hidden opacity-0 pointer-events-none"
        )}
      >
        {label}
      </span>

      {/* Shortcut */}
      {shortcut && open && (
        <span className="ml-auto mr-2 shrink-0 rounded-md border px-1.5 py-1 text-[10px] font-medium leading-none tracking-wide bg-sidebar-accent/60 text-muted-foreground/70 border-border/40">
          {modKey} {shortcut}
        </span>
      )}
      {shortcut && !open && (
        <span className="hidden" aria-hidden>
          {modKey} {shortcut}
        </span>
      )}
    </button>
  );
}
