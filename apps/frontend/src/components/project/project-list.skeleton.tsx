"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { actionCardClassName } from "@/lib/styles";

// Mirrors <ContinueCard /> 1:1
// Structure:
//   div.flex.flex-col.gap-2
//     span (label "Last updated") → skeleton
//     Link > Button[variant=outline + actionCardClassName + gap-2]
//       div.flex.w-full.items-center.justify-between
//         div.flex.min-w-0.items-center.gap-2  → icon + name
//         ArrowRightIcon                        → skeleton
//       span.text-xs (date)                     → skeleton
export const ContinueCardSkeleton = () => {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Last updated
      </span>      <Skeleton className="h-3 w-20" />

      {/* mirrors Button variant="outline" + actionCardClassName + className="gap-2"
          actionCardClassName already sets flex-col, padding, border, rounded, etc. */}
      <div
        className={cn(
          actionCardClassName,
          "gap-2 pointer-events-none select-none"
        )}
      >
        {/* top row */}
        <div className="flex w-full items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            {/* ProjectIcon size-3.5 */}
            <Skeleton className="size-3.5 rounded-full shrink-0" />
            {/* project name */}
            <Skeleton className="h-4 w-40" />
          </div>
          {/* ArrowRightIcon size-4 */}
          <Skeleton className="size-4 shrink-0" />
        </div>

        {/* date row — same as "text-xs text-muted-foreground" line-height ~12px */}
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
};