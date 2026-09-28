import { create } from "zustand";

export interface TabState {
    openTabs: string[];
    activeTabId: string | null;
    previewTabId: string | null;
}

const defaultTabState: TabState = {
    openTabs: [],
    activeTabId: null,
    previewTabId: null,
};

export type SandboxStatus = "idle" | "starting" | "ready" | "error";

export interface SandboxState {
    status: SandboxStatus;
    sandboxId?: string;
    error?: string;
}

interface EditorStore {
    tabs: Map<string, TabState>;
    sandboxByProject: Map<string, SandboxState>;

    getTabState: (projectId: string) => TabState;
    getSandboxState: (projectId: string) => SandboxState;

    openFile: (
        projectId: string,
        fileId: string,
        options: {
            pinned: boolean;
        },
    ) => void;

    closeTab: (
        projectId: string,
        fileId: string,
    ) => void;

    closeAllTabs: (
        projectId: string,
    ) => void;

    setActiveTab: (
        projectId: string,
        fileId: string,
    ) => void;

    removeProject: (
        projectId: string,
    ) => void;

    setSandboxState: (
        projectId: string,
        patch: Partial<SandboxState>,
    ) => void;
}

const defaultSandboxState: SandboxState = { status: "idle" };

export const useEditorStore = create<EditorStore>()((set, get) => ({
  tabs: new Map(),
  sandboxByProject: new Map(),

  getTabState: (projectId) => {
    return get().tabs.get(projectId) ?? defaultTabState;
  },

  getSandboxState: (projectId) => {
    return get().sandboxByProject.get(projectId) ?? defaultSandboxState;
  },

  openFile: (projectId, fileId, { pinned }) => {
    const tabs = new Map(get().tabs);
    const state = tabs.get(projectId) ?? defaultTabState;
    const { openTabs, previewTabId } = state;
    const isOpen = openTabs.includes(fileId);

    // Case 1: Opening as preview - replace existing preview or add new
    if (!isOpen && !pinned) {
      const newTabs = previewTabId
        ? openTabs.map((id) => (id === previewTabId) ? fileId : id)
        : [...openTabs, fileId]

      tabs.set(projectId, {
        openTabs: newTabs,
        activeTabId: fileId,
        previewTabId: fileId,
      });
      set({ tabs });
      return;
    }

    // Case 2: Opening as pinned - add new tab
    if (!isOpen && pinned) {
      tabs.set(projectId, {
        ...state,
        openTabs: [...openTabs, fileId],
        activeTabId: fileId,
      });
      set({ tabs });
      return;
    }

    // Case 3: File already open - just activate (and pin if double-clicked)
    const shouldPin = pinned && previewTabId === fileId;
    tabs.set(projectId, {
      ...state,
      activeTabId: fileId,
      previewTabId: shouldPin ? null : previewTabId,
    });
    set({ tabs });
  },

  closeTab: (projectId, fileId) => {
    const tabs = new Map(get().tabs);
    const state = tabs.get(projectId) ?? defaultTabState;
    const { openTabs, activeTabId, previewTabId } = state;
    const tabIndex = openTabs.indexOf(fileId);

    if (tabIndex === -1) return;

    const newTabs = openTabs.filter((id) => id !== fileId);

    let newActiveTabId = activeTabId;
    if (activeTabId === fileId) {
      if (newTabs.length === 0) {
        newActiveTabId = null;
      } else if (tabIndex >= newTabs.length) {
        newActiveTabId = newTabs[newTabs.length - 1];
      } else {
        newActiveTabId = newTabs[tabIndex];
      }
    }

    tabs.set(projectId, {
      openTabs: newTabs,
      activeTabId: newActiveTabId,
      previewTabId: previewTabId === fileId ? null : previewTabId,
    });
    set({ tabs });
  },

  closeAllTabs: (projectId) => {
    const tabs = new Map(get().tabs);
    tabs.set(projectId, defaultTabState);
    set({ tabs });
  },

  setActiveTab: (projectId, fileId) => {
    const tabs = new Map(get().tabs);
    const state = tabs.get(projectId) ?? defaultTabState;
    tabs.set(projectId, { ...state, activeTabId: fileId });
    set({ tabs });
  },

  removeProject: (projectId) => {
    const tabs = new Map(get().tabs);
    tabs.delete(projectId);
    const sandboxByProject = new Map(get().sandboxByProject);
    sandboxByProject.delete(projectId);
    set({ tabs, sandboxByProject });
  },

  setSandboxState: (projectId, patch) => {
    const sandboxByProject = new Map(get().sandboxByProject);
    const current = sandboxByProject.get(projectId) ?? defaultSandboxState;
    sandboxByProject.set(projectId, { ...current, ...patch });
    set({ sandboxByProject });
  },
}));