import { useMemo } from "react";
import { create } from "zustand";
import { socket } from "@/lib/socket/socket";
import { useFilesStore } from "@/store/file.store";

export type FileViewer = {
  socketId: string;
  userId: string;
  userName: string;
  fileId: string;
  projectId: string;
};

type FilePresenceState = {
  viewers: FileViewer[];
  setViewers: (viewers: FileViewer[]) => void;
  addViewer: (viewer: FileViewer) => void;
  removeViewer: (socketId: string, fileId?: string) => void;
  clear: () => void;
};

export const useFilePresenceStore = create<FilePresenceState>((set) => ({
  viewers: [],

  setViewers: (viewers) => set({ viewers }),

  addViewer: (viewer) =>
    set((state) => ({
      viewers: [
        ...state.viewers.filter((item) => item.socketId !== viewer.socketId),
        viewer,
      ],
    })),

  removeViewer: (socketId, fileId) =>
    set((state) => ({
      viewers: state.viewers.filter((item) => {
        if (item.socketId !== socketId) return true;
        if (fileId && item.fileId !== fileId) return true;
        return false;
      }),
    })),

  clear: () => set({ viewers: [] }),
}));

export function useFileViewers(fileId: string) {
  const viewers = useFilePresenceStore((state) => state.viewers);
  return useMemo(() => {
    const selfId = socket.id;
    return viewers.filter(
      (viewer) => viewer.fileId === fileId && viewer.socketId !== selfId,
    );
  }, [viewers, fileId]);
}

export function useFolderViewers(folderId: string, projectId: string) {
  const viewers = useFilePresenceStore((state) => state.viewers);
  const allFiles = useFilesStore((state) => state.files[projectId] ?? []);
  return useMemo(() => {
    const selfId = socket.id;
    const childrenMap = new Map<string, typeof allFiles>();
    for (const f of allFiles) {
      const pid = f.parentId ?? "__root__";
      const arr = childrenMap.get(pid);
      if (arr) arr.push(f);
      else childrenMap.set(pid, [f]);
    }
    const descendantFileIds = new Set<string>();
    const queue: string[] = [folderId];
    const visited = new Set<string>([folderId]);
    while (queue.length) {
      const cur = queue.shift()!;
      const children = childrenMap.get(cur) ?? [];
      for (const child of children) {
        if (child.type === "file") {
          descendantFileIds.add(child.id);
        } else if (child.type === "folder" && !visited.has(child.id)) {
          visited.add(child.id);
          queue.push(child.id);
        }
      }
    }
    return viewers.filter(
      (viewer) =>
        descendantFileIds.has(viewer.fileId) && viewer.socketId !== selfId,
    );
  }, [viewers, allFiles, folderId]);
}
