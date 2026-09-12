"use client";

import { cn } from "@/lib/utils";
import { CollapseLabel } from "./CollapseLabel";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import type { LucideIcon } from "lucide-react";
import { useModKeyLabel } from "@/lib/hooks/useModKeyLabel";
import Link from "next/link";

export function NavItem({
  icon,
  label,
  shortcut,
  active,
  open,
  href,
  onClick,
}: {
  icon: LucideIcon | IconSvgElement;
  label: string;
  shortcut?: string;
  active?: boolean;
  open: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const Icon = icon as LucideIcon;
  const modKey = useModKeyLabel();

  const content = (
    <>
      {/* Icon box — العرض 32 ثابت للمحاذاة، الارتفاع 28 زي الصف */}
      <span
        className={cn(
          "flex h-7 w-8 shrink-0 items-center justify-center transition-colors duration-200",
          active
            ? "text-sidebar-foreground"
            : "text-muted-foreground/60 group-hover:text-sidebar-foreground",
        )}
      >
        {Array.isArray(Icon) ? (
          <HugeiconsIcon icon={Icon} className="size-4.5 shrink-0" />
        ) : (
          <Icon className="size-4.5 shrink-0" />
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
        <span className="ml-auto mr-2 shrink-0 rounded-sm border px-1.5 py-1 text-[10px] font-medium leading-none tracking-wide bg-sidebar-accent/60 text-muted-foreground/70 border-border/40">
          {modKey} {shortcut}
        </span>
      )}
      {shortcut && !open && (
        <span className="hidden" aria-hidden>
          {modKey} {shortcut}
        </span>
      )}
    </>
  );

  const handleClick = () => {
    onClick?.();
  };

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "group relative flex h-7 w-full items-center rounded-sm p-0 ring-1",
          "text-[13.5px] font-[450] tracking-[-0.01em]",
          "transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0",

           !active &&
             cn(
               "ring-transparent text-muted-foreground",
               "hover:bg-foreground/[0.06] hover:text-sidebar-foreground hover:ring-border/50",
             ),

           active &&
             cn(
               "bg-foreground/[0.06] ring-border/50 text-sidebar-foreground shadow-sm",
               "hover:bg-foreground/[0.08]"
             ),

          !open && "cursor-pointer"
        )}
        onClick={handleClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      title={label}
      onClick={(e) => {
        if (!open) e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "group relative flex h-7 w-full items-center rounded-sm p-0 ring-1",
        "text-[13.5px] font-[450] tracking-[-0.01em]",
        "transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0",

        !active &&
          cn(
            "ring-transparent text-muted-foreground",
            "hover:bg-foreground/[0.06] hover:text-sidebar-foreground hover:ring-border/50",
          ),

        active &&
          cn(
            "bg-foreground/[0.06] ring-border/50 text-sidebar-foreground shadow-sm",
            "hover:bg-foreground/[0.08]"
          ),

        !open && "cursor-pointer"
      )}
    >
      {content}
    </button>
  );
}
