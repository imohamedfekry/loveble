"use client";

import { ProjectNavbar } from "./project-navbar";
import { useRealtimeProjects } from "@/lib/hooks/projects/useRealtimeProjects";
import { useLoadUser } from "@/lib/hooks/user/useLoadUser";

export const ProjectIdLayout = ({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: string;
}) => {
  useLoadUser();
  useRealtimeProjects();

  return (
    <div className="flex h-screen w-full flex-col">
      <ProjectNavbar projectId={projectId} />
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
};