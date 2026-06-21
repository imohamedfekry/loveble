import { Project } from "@/lib/types/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ProjectIcon } from "./project.item";
import { cn } from "@/lib/utils";
import { actionCardClassName } from "@/lib/styles";

interface ContinueCardProps {
  data: Project;
}

export const ContinueCard = ({ data }: ContinueCardProps) => {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Last updated
      </span>
      <Link className="group" href={`/project/${data.id}`}>
        <Button
          variant="outline"
          className={cn(actionCardClassName, "gap-2")}
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <ProjectIcon status={data.importStatus} />
              <span className="truncate font-medium">{data.name}</span>
            </div>
            <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true })}
          </span>
        </Button>
      </Link>
    </div>
  );
};
