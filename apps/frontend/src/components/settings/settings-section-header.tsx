"use client";

import { cn } from "@/lib/utils";

type SettingsSectionHeaderProps = {
  title: string;
  description?: string;
  className?: string;
};

export function SettingsSectionHeader({
  title,
  description,
  className,
}: SettingsSectionHeaderProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
