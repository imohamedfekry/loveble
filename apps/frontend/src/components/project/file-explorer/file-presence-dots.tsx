"use client";

import { useMemo } from "react";
import {
  useFileViewers,
  useFolderViewers,
  type FileViewer,
} from "@/store/file-presence.store";

function buildDisplayNames(viewers: FileViewer[]) {
  const byUser = new Map<string, string[]>();
  for (const viewer of viewers) {
    const sockets = byUser.get(viewer.userId) ?? [];
    if (!sockets.includes(viewer.socketId)) sockets.push(viewer.socketId);
    byUser.set(viewer.userId, sockets);
  }
  for (const sockets of byUser.values()) {
    sockets.sort();
  }

  const names = new Map<string, string>();
  for (const viewer of viewers) {
    const sockets = byUser.get(viewer.userId) ?? [viewer.socketId];
    const index = Math.max(0, sockets.indexOf(viewer.socketId));
    names.set(
      viewer.socketId,
      sockets.length > 1 && index > 0
        ? `${viewer.userName} ${index}`
        : viewer.userName,
    );
  }
  return names;
}

function PresenceDotsView({ viewers }: { viewers: FileViewer[] }) {
  const displayNames = useMemo(
    () => buildDisplayNames(viewers),
    [viewers],
  );

  if (viewers.length === 0) return null;

  const visible = viewers.slice(0, 4);
  const extra = viewers.length - visible.length;
  const tooltip = viewers
    .map((viewer) => displayNames.get(viewer.socketId) ?? viewer.userName)
    .join(", ");

  return (
    <span className="ml-auto flex shrink-0 items-center pr-1" title={tooltip}>
      <span className="flex items-center -space-x-1">
        {visible.map((viewer) => (
          <span
            key={viewer.socketId}
            className="flex size-3.5 items-center justify-center rounded-full text-[8px] font-semibold text-white ring-1 ring-sidebar"
            style={{ backgroundColor: viewer.color }}
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
