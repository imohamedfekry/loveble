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
        // ─────────────────────────────────────────────
        // Base
        // ─────────────────────────────────────────────
        "relative flex h-8 w-full items-center overflow-hidden rounded-md px-2",
        "text-sm text-sidebar-foreground",
        "transition-[background-color,color]",
        "duration-(--duration-quick) ease-(--ease-smooth-out)",
        "motion-reduce:transition-none",

        // ─────────────────────────────────────────────
        // Focus
        // ─────────────────────────────────────────────
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-inset",
        "focus-visible:ring-sidebar-ring/70",

        // ─────────────────────────────────────────────
        // Indicator
        // 3px wide × ~18px high
        // Transform only → no layout shift
        // ─────────────────────────────────────────────
        "after:pointer-events-none after:absolute",
        "after:left-[-2.8%] after:top-1/2",
        "after:h-[56%] after:w-[3px]",
        "after:-translate-y-1/2",
        "after:origin-center after:rounded-full",
        "after:bg-muted-foreground",
        "after:content-['']",

        // Hidden / idle
        "after:scale-y-40 after:opacity-0",

        // Smooth animation
        "after:transition-[opacity,transform,background-color]",
        "after:duration-(--duration-quick)",
        "after:ease-(--ease-smooth-out)",
        "motion-reduce:after:transition-none",

        // ─────────────────────────────────────────────
        // Hover — inactive
        // Noticeably visible, but softer than active
        // ─────────────────────────────────────────────
        !active && [
          "hover:bg-sidebar-nav-hover",
          "hover:after:scale-y-90",
          "hover:after:opacity-50",
        ],

        // ─────────────────────────────────────────────
        // Active
        // ─────────────────────────────────────────────
        active && [
          "bg-sidebar-nav-active",
          "after:bg-sidebar-foreground",
          "after:scale-y-100",
          "after:opacity-100",
        ],

        // ─────────────────────────────────────────────
        // Active + Hover
        // Keep the active indicator stable
        // ─────────────────────────────────────────────
        active && [
          "hover:bg-sidebar-nav-active-hover",
          "hover:after:bg-sidebar-foreground",
          "hover:after:scale-y-100",
          "hover:after:opacity-100",
        ],

        // ─────────────────────────────────────────────
        // Collapsed sidebar
        // ─────────────────────────────────────────────
        !open && "cursor-pointer"
      )}
    >
      {/* Icon */}
      {Array.isArray(Icon) ? (
        <HugeiconsIcon
          icon={Icon}
          className="size-4 shrink-0"
        />
      ) : (
        <Icon className="size-4 shrink-0" />
      )}

      {/* Label */}
      <CollapseLabel
        open={open}
        className="ml-2.5"
      >
        {label}
      </CollapseLabel>

      {/* Shortcut */}
      {shortcut && (
        <span
          className={cn(
            "ml-auto shrink-0 rounded px-1.5 py-0.5",
            "bg-sidebar-accent",
            "text-[10px] font-medium leading-none",
            "whitespace-nowrap text-muted-foreground",
            "transition-[background-color,color,opacity]",
            "duration-(--duration-quick)",
            "ease-(--ease-smooth-out)",
            "motion-reduce:transition-none",

            open
              ? "opacity-100"
              : "pointer-events-none opacity-0",

            active && "text-sidebar-foreground/70"
          )}
        >
          {modKey} {shortcut}
        </span>
      )}
    </button>
  );
}

