"use client";

import { useLoadProjects } from "@/lib/hooks/projects/useLoadProjects";
import { useRealtimeProjects } from "@/lib/hooks/projects/useRealtimeProjects";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useLoadProjects({ recent: true });
  useRealtimeProjects();

  return <>{children}</>;
}
