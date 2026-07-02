import Link from "next/link";
import type { ImportStatus, Project } from "@/lib/types/types";
import {
  AlertCircleIcon,
  ChevronRightIcon,
  GlobeIcon,
  Loader2Icon,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { iconBadgeClassName } from "@/lib/styles";

interface ProjectItemProps {
  data: Project;
  className?: string;
}

export function getImportStatusLabel(status: ImportStatus) {
  switch (status) {
    case "importing":
      return "Importing…";
    case "failed":
      return "Import failed";
    default:
      return null;
  }
}

export const ProjectIcon = ({ status }: { status: ImportStatus }) => {
  switch (status) {
    case "completed":
      return <FaGithub className="size-3.5 shrink-0" />;
    case "failed":
      return <AlertCircleIcon className="size-3.5 shrink-0 text-destructive" />;
    case "importing":
      return (
        <Loader2Icon className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
      );
    default:
      return <GlobeIcon className="size-3.5 shrink-0 text-muted-foreground" />;
  }
};

export function ProjectIconBadge({
  status,
  size = "default",
}: {
  status: ImportStatus;
  size?: "default" | "lg";
}) {
  return (
    <div
      className={cn(
        iconBadgeClassName,
        size === "lg" ? "size-10" : "size-8",
        status === "failed" && "border-destructive/20 bg-destructive/10 text-destructive",
        status === "importing" && "border-ring/20 bg-accent/40",
      )}
    >
      <ProjectIcon status={status} />
    </div>
  );
}

export const ProjectItem = ({ data, className }: ProjectItemProps) => {
  const statusLabel = getImportStatusLabel(data.importStatus);
  const updatedAt = formatDistanceToNow(new Date(data.updatedAt), {
    addSuffix: true,
  });

  return (
    <li>
      <Link
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 transition-all hover:bg-accent/40",
          className,
        )}
        href={`/project/${data.id}`}
      >
        <ProjectIconBadge status={data.importStatus} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {data.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {statusLabel ?? updatedAt}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {statusLabel && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {updatedAt}
            </span>
          )}
          <ChevronRightIcon className="size-4 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
        </div>
      </Link>
    </li>
  );
};
