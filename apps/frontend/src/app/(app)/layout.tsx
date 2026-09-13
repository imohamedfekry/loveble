"use client";

import { SocketProvider } from "@/lib/socket/socketProvider";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { ConnectorsDialog } from "@/components/layout/ConnectorsDialog";
import { useConnectorsStore } from "@/store/connectors.store";
import { useLoadUser } from "@/lib/hooks/user/useLoadUser";
import { useRealtimeProjects } from "@/lib/socket/hooks/useRealtimeProjects";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen: connectorsOpen, closeConnectors } = useConnectorsStore();

  // Session-owned: user once + realtime list subscription (no list fetch here).
  // Each route fetches the list slice it needs (dashboard: recent, /projects: all).
  useLoadUser();
  useRealtimeProjects();

  return (
    <SocketProvider>
      {children}
      <GlobalSearch />
      <ConnectorsDialog 
        open={connectorsOpen} 
        onOpenChange={() => closeConnectors()} 
      />
    </SocketProvider>
  );
}