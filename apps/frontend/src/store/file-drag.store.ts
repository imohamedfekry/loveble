import { create } from "zustand";
import type { ProjectFileType } from "@/lib/api/apis/files/types";

interface FileDragState {
  item: ProjectFileType | null;
  overChat: boolean;
  start: (item: ProjectFileType) => void;
  setOverChat: (over: boolean) => void;
  end: () => void;
}

export const useFileDragStore = create<FileDragState>((set) => ({
  item: null,
  overChat: false,

  start: (item) => set({ item, overChat: false }),
  setOverChat: (overChat) => set({ overChat }),
  end: () => set({ item: null, overChat: false }),
}));
