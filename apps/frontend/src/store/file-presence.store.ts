import { useMemo } from "react";
import { create } from "zustand";

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
  return useMemo(
    () => viewers.filter((viewer) => viewer.fileId === fileId),
    [viewers, fileId],
  );
}
