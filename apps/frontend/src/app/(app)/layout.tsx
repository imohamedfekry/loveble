"use client";

import { CircleAlertIcon } from "lucide-react";
import { Button } from "@loveble/ui/button";

import { SocketProvider } from "@/lib/socket/socketProvider";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { ConnectorsDialog } from "@/components/layout/ConnectorsDialog";
import { useConnectorsStore } from "@/store/connectors.store";
import { useLoadUser } from "@/lib/hooks/user/useLoadUser";
import { useRealtimeProjects } from "@/lib/socket/hooks/useRealtimeProjects";

function UserLoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="surface-card w-full max-w-sm space-y-4 p-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <CircleAlertIcon className="size-6 text-destructive" />
        </div>

        <div className="space-y-1">
          <h1 className="text-lg font-semibold">
            Couldn&apos;t load your account
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        <Button className="w-full" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen: connectorsOpen, closeConnectors } = useConnectorsStore();
  const { error: userError, retry: retryUser } = useLoadUser();

  // Session-owned: user once + realtime list subscription (no list fetch here).
  // Each route fetches the list slice it needs (dashboard: recent, /projects: all).
  useRealtimeProjects();

  return (
    <SocketProvider>
      {userError ? (
        <UserLoadError message={userError} onRetry={retryUser} />
      ) : (
        <>
          {children}
          <GlobalSearch />
          <ConnectorsDialog
            open={connectorsOpen}
            onOpenChange={() => closeConnectors()}
          />
        </>
      )}
    </SocketProvider>
  );
}
