"use client";

import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type ConnectionLoadingProps = {
  message?: string;
  className?: string;
};

export function ConnectionLoading({
  message = "Connecting…",
  className,
}: ConnectionLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className,
      )}
    >
      <Spinner className="size-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground text-pretty">{message}</p>
    </div>
  );
}
