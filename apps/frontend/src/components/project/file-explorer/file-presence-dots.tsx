"use client";

import { useMemo } from "react";
import {
  useFileViewers,
  useFolderViewers,
} from "@/store/file-presence.store";
import { peerColor } from "@/lib/socket/collab-protocol";

function buildDisplayInfo(
  viewers: { userId: string; userName: string; socketId: string }[],
) {
  const byUser = new Map<string, string[]>();
  for (const v of viewers) {
    const sockets = byUser.get(v.userId) ?? [];
    if (!sockets.includes(v.socketId)) sockets.push(v.socketId);
    byUser.set(v.userId, sockets);
  }

  const names = new Map<string, string>();
  const colors = new Map<string, string>();
  for (const v of viewers) {
    const sockets = byUser.get(v.userId) ?? [v.socketId];
    const index = Math.max(0, sockets.indexOf(v.socketId));
    const hasMultiple = sockets.length > 1;
    names.set(
      v.socketId,
      hasMultiple && index > 0 ? `${v.userName} ${index + 1}` : v.userName,
    );
    colors.set(v.socketId, peerColor(v.socketId, hasMultiple ? index : 0));
  }
  return { names, colors };
}

function PresenceDotsView({
  viewers,
}: {
  viewers: { userId: string; userName: string; socketId: string }[];
}) {
  const { names: displayNames, colors } = useMemo(
    () => buildDisplayInfo(viewers),
    [viewers],
  );

  if (viewers.length === 0) return null;

  const visible = viewers.slice(0, 4);
  const extra = viewers.length - visible.length;
  const tooltip = viewers
    .map((v) => displayNames.get(v.socketId) ?? v.userName)
    .join(", ");

  return (
    <span className="ml-auto flex shrink-0 items-center pr-1" title={tooltip}>
      <span className="flex items-center -space-x-1">
        {visible.map((viewer) => (
          <span
            key={viewer.socketId}
            className="flex size-3.5 items-center justify-center rounded-full text-[8px] font-semibold text-white ring-1 ring-sidebar"
            style={{ backgroundColor: colors.get(viewer.socketId) }}
          >
            {(displayNames.get(viewer.socketId) ?? viewer.userName)
              .slice(0, 1)
              .toUpperCase()}
          </span>
        ))}
      </span>
      {extra > 0 && (
        <span className="ml-0.5 text-[9px] text-muted-foreground">
          +{extra}
        </span>
      )}
    </span>
  );
}

export function FilePresenceDots({ fileId }: { fileId: string }) {
  const viewers = useFileViewers(fileId);
  return <PresenceDotsView viewers={viewers} />;
}

export function FolderPresenceDots({
  folderId,
  projectId,
  isOpen,
}: {
  folderId: string;
  projectId: string;
  isOpen: boolean;
}) {
  const viewers = useFolderViewers(folderId, projectId);
  if (isOpen) return null;
  return <PresenceDotsView viewers={viewers} />;
}
