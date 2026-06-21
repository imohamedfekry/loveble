"use client";

import { useLoadProjects } from "@/lib/hooks/projects/useLoadProjects";
import { useRealtimeProjects } from "@/lib/hooks/projects/useRealtimeProjects";
import { useLoadUser } from "@/lib/hooks/user/useLoadUser";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useLoadUser();
  useLoadProjects({ recent: true });
  useRealtimeProjects();

  return <>{children}</>;
}
