"use client";

import { useEffect, useState } from "react";

import { ConnectionLoading } from "@/components/layout/connection-loading";
import { AppSidebar } from "@/components/layout/sidebar/AppSidebar";

import { useLoadProjects } from "@/lib/hooks/projects/useLoadProjects";
import { useLoadUser } from "@/lib/hooks/user/useLoadUser";
import { useRealtimeProjects } from "@/lib/socket/hooks/useRealtimeProjects";
import { useIsSocketReady, useSocketStore } from "@/lib/socket/socket-store";
import { useProjectsStore } from "@/store/project.store";
import { useUserStore } from "@/store/user.store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isSocketReady = useIsSocketReady();
  const socketStatus = useSocketStore((s) => s.status);

  useLoadUser();
  useLoadProjects({ recent: true });
  useRealtimeProjects();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isLoading = !isSocketReady;

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7644/ingest/4ee6c70f-604f-41ee-ad41-991110d55c8b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8d0fd6'},body:JSON.stringify({sessionId:'8d0fd6',location:'dashboard/layout.tsx:state',message:'Dashboard layout state',data:{isSocketReady,socketStatus,isLoading,projectsLoading:useProjectsStore.getState().loading,userLoading:useUserStore.getState().isLoading,projectsCount:useProjectsStore.getState().projects.length},timestamp:Date.now(),hypothesisId:'D-E'})}).catch(()=>{});
    // #endregion
  }, [isSocketReady, socketStatus, isLoading]);

  return (
    <>
      {
        isLoading ? (
          <ConnectionLoading
            className="flex-1"
            message="Loading..."
          />
        ) : (
          <>
            <div className="flex h-screen bg-[#0d0d12]">
              <AppSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
              <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex min-h-0 flex-1 flex-col overflow-auto">
                  {children}
                </div>
              </main>
            </div >
          </>
        )
      }
    </>
  );
}