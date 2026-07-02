"use client";

import { cn } from "@/lib/utils";

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
        "flex items-start justify-between gap-4 rounded-lg bg-muted/30 px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
