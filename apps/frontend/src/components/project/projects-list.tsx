"use client";

import { useProjectsStore } from "@/store/project.store";
import { ShortcutKbd } from "../ui/shortcut-kbd";
import { Spinner } from "../ui/spinner";
import { ProjectItem } from "./project.item";
import { ContinueCard } from "./continue.card";
import { ContinueCardSkeleton } from "./project-list.skeleton";

interface ProjectListProps {
  onViewAll: () => void;
}

export const ProjectsList = ({ onViewAll }: ProjectListProps) => {
  const { projects, loading } = useProjectsStore();

  if (loading) {
    return <ContinueCardSkeleton />;
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <span className="text-sm text-muted-foreground">
          No projects found
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <ContinueCard data={projects[0]} />

        {projects.length > 1 && (
          <>  
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Recent projects
              </span>

              <button
                type="button"
                onClick={onViewAll}
                className="flex items-center gap-2 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
              >
                <span>View all</span>
                <ShortcutKbd keyLetter="K" />

              </button>
            </div>

            <ul className="flex flex-col">
              {projects.slice(1, 5).map((project) => (
                <ProjectItem key={project.id} data={project} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};