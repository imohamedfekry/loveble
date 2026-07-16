"use client";

import { Navbar } from "@/components/layout/navbar";
import { ConnectionLoading } from "@/components/layout/connection-loading";
import { useLoadProjects } from "@/lib/hooks/projects/useLoadProjects";
import { useLoadUser } from "@/lib/hooks/user/useLoadUser";
import { useRealtimeProjects } from "@/lib/socket/hooks/useRealtimeProjects";
import { useIsSocketReady } from "@/lib/socket/socket-store";
import { useProjectsStore } from "@/store/project.store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useLoadUser();
  useLoadProjects({ recent: true });
  useRealtimeProjects();

  const projectsLoading = useProjectsStore((s) => s.loading);
  const projects = useProjectsStore((s) => s.projects);
  const isSocketReady = useIsSocketReady();

  const isReady = !projectsLoading;

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col ">
        {!isReady ? (
          <ConnectionLoading
            className="flex-1"
            message="Loading projects…"
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        )}
      </main>
    </div>
  );
}
