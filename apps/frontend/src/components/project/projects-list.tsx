"use client";

import { useProjectsStore } from "@/store/project.store";
import { Kbd } from "../ui/kbd";
import { Spinner } from "../ui/spinner";
import { ProjectItem } from "./project.item";
import { ContinueCard } from "./continue.card";

interface ProjectListProps {
  onViewAll: () => void;
}

export const ProjectsList = ({ onViewAll }: ProjectListProps) => {
  const { projects, loading } = useProjectsStore();

  if (loading && projects.length === 0) {
    return <Spinner className="size-4 text-ring" />;
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
                className="flex items-center gap-2 text-muted-foreground text-xs hover:text-foreground transition-colors"
              >
                <span>View all</span>
                <Kbd className="bg-accent border">ctrl + K</Kbd>
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