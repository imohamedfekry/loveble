import Link from "next/link";
import type { ImportStatus, Project } from "@/lib/types/types";
import { AlertCircleIcon, GlobeIcon, Loader2Icon } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";

interface ProjectItemProps {
  data: Project;
}

export const ProjectIcon = ({ status }: { status: ImportStatus }) => {
  switch (status) {
    case "completed":
      return <FaGithub className="size-3.5 shrink-0 text-muted-foreground" />;
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

export const ProjectItem = ({ data }: ProjectItemProps) => {
  return (
    <li>
      <Link
        className="group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-accent/40 hover:text-foreground"
        href={`/project/${data.id}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <ProjectIcon status={data.importStatus} />
          <span className="truncate">{data.name}</span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground transition-colors group-hover:text-foreground/60">
          {formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true })}
        </span>
      </Link>
    </li>
  );
};
