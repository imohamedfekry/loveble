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
          "group flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm whitespace-nowrap text-neutral-300 transition-colors duration-(--duration-quick) ease-out hover:bg-neutral-800",
          className
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {data.name}
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          <MoreHorizontal className="h-4 w-4 translate-x-1 opacity-0 transition-[transform,opacity] duration-(--duration-fast) ease-(--ease-smooth-out) motion-reduce:transition-none group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100" />
        </div>
      </Link>
    </li>
  );
};
