import { Project } from "@/lib/types/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, Link as LinkIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ProjectIcon } from "./project.item";

interface ContinueCardProps {
    data: Project;
}

export const ContinueCard = ({ data }: ContinueCardProps) => {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">
                Last updated
            </span>
            <Link className="group" href={`/project/${data.id}`}>
                <Button
                    variant="outline"
                    className="h-auto items-start justify-start p-4 bg-background border rounded-none flex flex-col gap-2 w-full"
                >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <ProjectIcon status={data.importStatus} />
                            <span className="font-medium truncate">
                                {data.name}
                            </span>
                        </div>
                        <ArrowRightIcon className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                        last updated : {formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true, })}
                    </span>
                </Button>
            </Link>
        </div>
    )
};