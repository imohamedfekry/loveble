"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ProjectItemSkeletonProps {
  className?: string;
}

export const ProjectItemSkeleton = ({
  className,
}: ProjectItemSkeletonProps) => {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <li key={index}>
          <div
            className={cn(
              "flex w-full items-center rounded-md px-2 py-1.5",
              className
            )}
          >
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-40 rounded-md" />
            </div>
          </div>
        </li>
      ))}
    </>
  );
};