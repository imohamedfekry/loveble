"use client";

import { useEffect } from "react";

import { useLoadFiles } from "@/lib/hooks/file/useFiles";
import { useProjectRealtime } from "@/lib/socket/hooks/useProjectRealtime";
import { useLoadProject } from "@/lib/hooks/projects/useLoadProject";
import { ProjectNavbar } from "./project-navbar";
import ProjectSkeleton from "@/components/layout/Skeleton/project/ProjectSkeleton";
import { useFilesStore } from "@/store/file.store";

export const ProjectIdLayout = ({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: string;
}) => {
  useLoadFiles(projectId);
  useProjectRealtime(projectId);

  const { project, loading: projectLoading } = useLoadProject(projectId);
  const files = useFilesStore((s) => s.files[projectId]);
  const filesLoading = useFilesStore((s) => s.loadingProjects[projectId] ?? false);
  const isInitialFilesLoading = filesLoading && !files;

  useEffect(() => {
    const expected = project?.name ? `${project.name} | Loveble` : "Loveble";

    const apply = () => {
      if (document.title !== expected) {
        document.title = expected;
      }
    };

    apply();

    // Next.js re-applies route metadata during client-side navigation,
    // so keep re-applying our title whenever the <title> changes.
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [project?.name]);

  // Warm ember accent, scoped to project routes only.
  useEffect(() => {
    document.documentElement.setAttribute("data-accent", "ember");
    return () => {
      document.documentElement.removeAttribute("data-accent");
    };
  }, []);

  // Unified: show full ProjectSkeleton until both project + initial files are ready
  // Subsequent file reloads keep inner TreeItemWrapperSkeleton (FileExplorer) — not this outer
  const isReady = !projectLoading && !isInitialFilesLoading;

  return (
    <>
      {!isReady ? (
        <ProjectSkeleton />
      ) : (
        <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background">
          <ProjectNavbar projectId={projectId} />
          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      )}
    </>
  );
};