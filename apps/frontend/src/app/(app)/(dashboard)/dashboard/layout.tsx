"use client";

import { useState } from "react";

import { ConnectionLoading } from "@/components/layout/connection-loading";
import { AppSidebar } from "@/components/layout/sidebar/AppSidebar";

import { useLoadProjects } from "@/lib/hooks/projects/useLoadProjects";
import { useLoadUser } from "@/lib/hooks/user/useLoadUser";
import { useRealtimeProjects } from "@/lib/socket/hooks/useRealtimeProjects";
import { useProjectsStore } from "@/store/project.store";
import { useUserStore } from "@/store/user.store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useLoadUser();

  useLoadProjects({ recent: true });

  useRealtimeProjects();

  const userLoading = useUserStore((s) => s.isLoading);
  const projectsLoading = useProjectsStore((s) => s.loading);
  const projectsCount = useProjectsStore((s) => s.projects.length);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isInitialLoading =
    (userLoading || (projectsLoading && projectsCount === 0));

  return (
    <>
      {isInitialLoading ? (
        <ConnectionLoading className="flex-1" message="Loading..." />
      ) : (
        <div className="flex h-screen bg-background">
          <AppSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden ">
            <div className="flex min-h-0 flex-1 flex-col overflow-auto ">
              {children}
            </div>
          </main>
        </div>
      )}
    </>
  );
}