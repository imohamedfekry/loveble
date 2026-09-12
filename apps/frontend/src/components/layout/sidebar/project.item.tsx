import Link from "next/link";
import type { Project } from "@/lib/types/types";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectItemProps {
  data: Project;
  className?: string;
  variant?: "default" | "onDark";
}

export const ProjectItem = ({
  data,
  className,
  variant = "default",
}: ProjectItemProps) => {
  const onDark = variant === "onDark";

  return (
    <li>
      <Link
        href={`/project/${data.id}`}
        className={cn(
          "group flex h-8 w-full items-center rounded-lg p-0 pr-2 ring-1 ring-transparent text-left whitespace-nowrap",
          "text-[13.5px] font-[450] tracking-[-0.01em]",
          "transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          onDark
            ? "text-projects-muted hover:bg-white/[0.06] hover:text-projects-foreground"
            : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-sidebar-foreground hover:ring-border/50 dark:hover:bg-white/[0.06] dark:hover:ring-white/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          className
        )}
      >
        <div className="min-w-0 flex-1 pl-2">
          <p
            className={cn(
              "truncate text-[13.5px] font-[450]",
              onDark ? "text-projects-foreground" : "text-foreground"
            )}
          >
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
