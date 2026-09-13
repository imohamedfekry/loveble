"use client";

import { cn } from "@loveble/utils";

type SettingsRowProps = {
  label: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
};

export function SettingsRow({
  label,
  description,
  children,
  className,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border/30 bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="shrink-0 sm:ml-4">{children}</div>}
    </div>
  );
}
