"use client";
import { useProjectsStore } from "@/store/project.store";
import { ProjectItem } from "./project.item";
import { ProjectItemSkeleton } from "./project-item.skeleton";
export const ProjectsList = () => {
  const { projects, loading } = useProjectsStore();
  const recentProjects = projects.slice(0, 5);
  if (loading && projects.length === 0) {
    return <ProjectItemSkeleton />;
  }

  if (projects.length === 0) {
    return
  }

  return (
    <>
      {recentProjects.length > 0 && (
        <ul className="flex flex-col">
          {recentProjects.map((project) => (
            <ProjectItem key={project.id} data={project} />
          ))}

        </ul>
      )}
</>

  );
};
