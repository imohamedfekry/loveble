"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShortcutKbd } from "../ui/shortcut-kbd";

type ProjectActionCardProps = {
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  shortcut: string;
  onClick?: () => void;
  className?: string;
};

export function ActionIconBadge({
  icon: Icon,
  className,
  title,
}: {
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  className?: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 text-foreground">
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate text-sm font-semibold ">{title}</span>
    </div>
  );
}

export function ProjectActionCard({
  icon,
  title,
  description,
  shortcut,
  onClick,
  className,
}: ProjectActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "surface-card surface-card-hover group flex h-full min-w-0 w-full flex-col gap-2.5 p-3.5 text-left",
        className,
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <ActionIconBadge icon={icon} title={title} />
        <ShortcutKbd className="hidden sm:block" keyLetter={shortcut} />
      </div>

      {/* <div className="min-w-0"> */}
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
          {description}
        </p>
      {/* </div> */}
    </button>
  );
}
