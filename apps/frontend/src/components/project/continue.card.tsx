import { Project } from "@/lib/types/types";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  getImportStatusLabel,
  ProjectIconBadge,
} from "./project.item";
import { cn } from "@/lib/utils";
import { surfacePanelClassName } from "@/lib/styles";

interface ContinueCardProps {
  data: Project;
}

export const ContinueCard = ({ data }: ContinueCardProps) => {
  const statusLabel = getImportStatusLabel(data.importStatus);
  const updatedAt = formatDistanceToNow(new Date(data.updatedAt), {
    addSuffix: true,
  });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Continue
      </span>

      <Link
        className="group block"
        href={`/project/${data.id}`}
      >
        <div
          className={cn(
            surfacePanelClassName,
            "surface-card-hover flex-col items-stretch gap-3 p-4",
          )}
        >
          <div className="flex w-full items-center gap-3">
            <ProjectIconBadge status={data.importStatus} size="lg" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {data.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {statusLabel ?? `Updated ${updatedAt}`}
              </p>
            </div>

            <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </div>

          {statusLabel && (
            <p className="text-xs text-muted-foreground">{updatedAt}</p>
          )}
        </div>
      </Link>
    </div>
  );
};
