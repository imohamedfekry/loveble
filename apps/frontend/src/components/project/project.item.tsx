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
}

export const ProjectItem = ({ data }: ProjectItemProps) => {
    return (
        <li>
            <Link
                className="text-sm text-foreground/60 font-medium hover:text-foreground py-1 flex items-center justify-between w-full group"
                href={`/project/${data.id}`}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <ProjectIcon status={data.importStatus} />
                    <span className="truncate">{data.name}</span>
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground/60 transition-colors shrink-0">
                    {formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true, })}
                </span>
            </Link>
        </li>
    );
};
