"use client";

import { useEffect } from "react";

import { useLoadFiles } from "@/lib/hooks/file/useFiles";
import { useProjectRealtime } from "@/lib/socket/hooks/useProjectRealtime";
import { useLoadProject } from "@/lib/hooks/projects/useLoadProject";
import { ProjectNavbar } from "./project-navbar";
import ProjectSkeleton from "@/components/layout/Skeleton/project/ProjectSkeleton";
import { useFilesStore } from "@/store/file.store";
import { useEditorStore } from "@/store/use-editor-store";

export const ProjectIdLayout = ({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: string;
}) => {
  useLoadFiles(projectId);
  useProjectRealtime(projectId);

  const { project, loading: projectLoading, sandboxLoading } = useLoadProject(projectId);
  const files = useFilesStore((s) => s.files[projectId]);
  const filesLoading = useFilesStore((s) => s.loadingProjects[projectId] ?? false);
  const isInitialFilesLoading = filesLoading && !files;
  const isSandboxLoading = !!projectId && sandboxLoading;
  const setSandboxLoading = useEditorStore((s) => s.setSandboxLoading);

  // Sync sandboxLoading state to the store so EditorView can read it
  useEffect(() => {
    if (projectId) {
      setSandboxLoading(projectId, isSandboxLoading);
    }
  }, [projectId, isSandboxLoading, setSandboxLoading]);

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

  // Release the per-project file cache and editor tabs once we leave the
  // workspace, so long sessions don't accumulate every visited project.
  useEffect(() => {
    return () => {
      useFilesStore.getState().clearProjectState(projectId);
      useEditorStore.getState().removeProject(projectId);
    };
  }, [projectId]);

  // Unified: show full ProjectSkeleton until project + files + sandbox are ready
  const isReady = !projectLoading && !isInitialFilesLoading && !isSandboxLoading;

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