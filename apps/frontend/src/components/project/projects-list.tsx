"use client";

import { useProjectsStore } from "@/store/project.store";
import { ShortcutKbd } from "../ui/shortcut-kbd";
import { ProjectItem } from "./project.item";
import { ContinueCard } from "./continue.card";
import { ContinueCardSkeleton } from "./project-list.skeleton";
import { cn } from "@/lib/utils";
import { FolderOpenIcon } from "lucide-react";

interface ProjectListProps {
  onViewAll: () => void;
}

export const ProjectsList = ({ onViewAll }: ProjectListProps) => {
  const { projects, loading } = useProjectsStore();
  const recentProjects = projects.slice(1, 5);

  if (loading) {
    return <ContinueCardSkeleton />;
  }

  if (projects.length === 0) {
    return (
      <div
        className={cn(
          "surface-card flex flex-col items-center gap-2 px-4 py-8 text-center",
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-lg border border-border/50 bg-muted/40">
          <FolderOpenIcon className="size-4 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No projects yet</p>
        <p className="text-xs text-muted-foreground">
          Create or import a project to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ContinueCard data={projects[0]} />

      {recentProjects.length > 0 && (
        <section className="surface-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">
                Recent projects
              </span>
              <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {recentProjects.length}
              </span>
            </div>

            <button
              type="button"
              onClick={onViewAll}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            >
              <span>View all</span>
              <ShortcutKbd keyLetter="K" />
            </button>
          </div>

          <ul className="flex flex-col p-1">
            {recentProjects.map((project) => (
              <ProjectItem key={project.id} data={project} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
