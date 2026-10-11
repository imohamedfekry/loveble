import { create } from "zustand";

export type ChatContextKind = "file" | "folder" | "selection";

export interface ChatContextItem {
  id: string;
  kind: ChatContextKind;
  projectId: string;
  fileId: string;
  path: string;
  name: string;
  type: "file" | "folder";
  lineStart?: number;
  lineEnd?: number;
}

type ChatContextInput = Omit<ChatContextItem, "id"> & { id?: string };

function isSameMention(a: ChatContextItem, b: ChatContextInput) {
  return (
    a.kind === b.kind &&
    a.fileId === b.fileId &&
    a.lineStart === b.lineStart &&
    a.lineEnd === b.lineEnd
  );
}

let mentionCounter = 0;

function createMentionId() {
  mentionCounter += 1;
  return `ctx-${Date.now().toString(36)}-${mentionCounter}`;
}

interface ChatContextState {
  items: ChatContextItem[];
  add: (item: ChatContextInput) => void;
  addMany: (items: ChatContextInput[]) => void;
  remove: (id: string) => void;
  clearProject: (projectId: string) => void;
  clear: () => void;
}

export const useChatContextStore = create<ChatContextState>((set) => ({
  items: [],

  add: (item) =>
    set((state) => {
      if (state.items.some((existing) => isSameMention(existing, item))) {
        return state;
      }
      return {
        items: [...state.items, { ...item, id: item.id ?? createMentionId() }],
      };
    }),

  addMany: (list) =>
    set((state) => {
      if (list.length === 0) return state;
      const next = [...state.items];
      for (const item of list) {
        if (next.some((existing) => isSameMention(existing, item))) continue;
        next.push({ ...item, id: item.id ?? createMentionId() });
      }
      if (next.length === state.items.length) return state;
      return { items: next };
    }),

  remove: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

  clearProject: (projectId) =>
    set((state) => ({
      items: state.items.filter((item) => item.projectId !== projectId),
    })),

  clear: () => set({ items: [] }),
}));
