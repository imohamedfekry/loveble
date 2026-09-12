"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SocketProvider } from "@/lib/socket/socketProvider";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { ConnectorsDialog } from "@/components/layout/ConnectorsDialog";
import { useConnectorsStore } from "@/store/connectors.store";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isProjectPage = pathname?.startsWith("/project/");

  useEffect(() => {
    if (isProjectPage) {
      document.documentElement.setAttribute("data-project-page", "");
    } else {
      document.documentElement.removeAttribute("data-project-page");
    }
  }, [isProjectPage]);

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