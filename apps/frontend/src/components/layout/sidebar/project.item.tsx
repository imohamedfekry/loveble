import Link from "next/link";
import type { Project } from "@/lib/types/types";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectItemProps {
  data: Project;
  className?: string;
}

export const ProjectItem = ({
  data,
  className,
}: ProjectItemProps) => {
  return (
    <li>
      <Link
        href={`/project/${data.id}`}
        className={cn(
          "group flex h-8 w-full items-center rounded-lg p-0 pr-2 ring-1 ring-transparent text-left whitespace-nowrap",
          "text-[13.5px] font-[450] tracking-[-0.01em] text-muted-foreground",
          "transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          "hover:bg-foreground/[0.06] hover:text-sidebar-foreground hover:ring-border/50 dark:hover:bg-white/[0.06] dark:hover:ring-white/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          className
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 group-hover:bg-sidebar-foreground/60 transition-colors duration-200" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-[450] text-foreground">
            {data.name}
          </p>
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
          <MoreHorizontal className="h-4 w-4 opacity-0 transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 group-focus-visible:opacity-100" />
        </div>
      </Link>
    </li>
  );
};
