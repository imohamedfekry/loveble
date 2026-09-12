"use client";

import { SocketProvider } from "@/lib/socket/socketProvider";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { ConnectorsDialog } from "@/components/layout/ConnectorsDialog";
import { useConnectorsStore } from "@/store/connectors.store";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen: connectorsOpen, closeConnectors } = useConnectorsStore();

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