import { useCallback } from "react";
import { useEditorStore } from "../../store/use-editor-store";
import { ProjectFileType } from "../api/apis/files/types";

export const useEditor = (projectId: string) => {
  const tabState = useEditorStore((state) => state.getTabState(projectId));

  const openFileStore = useEditorStore((state) => state.openFile);
  const closeTabStore = useEditorStore((state) => state.closeTab);
  const closeAllTabsStore = useEditorStore((state) => state.closeAllTabs);
  const setActiveTabStore = useEditorStore((state) => state.setActiveTab);

  const openFile = useCallback(
    (fileId: string, options: { pinned: boolean }) => {
      openFileStore(projectId, fileId, options);
    },
    [openFileStore, projectId]
  );

  const closeTab = useCallback(
    (fileId: string) => {
      closeTabStore(projectId, fileId);
    },
    [closeTabStore, projectId]
  );

  const closeAllTabs = useCallback(() => {
    closeAllTabsStore(projectId);
  }, [closeAllTabsStore, projectId]);

  const setActiveTab = useCallback(
    (fileId: string) => {
      setActiveTabStore(projectId, fileId);
    },
    [setActiveTabStore, projectId]
  );

  return {
    openTabs: tabState.openTabs,
    activeTabId: tabState.activeTabId,
    previewTabId: tabState.previewTabId,
    openFile,
    closeTab,
    closeAllTabs,
    setActiveTab,
  };
};
export const getFilePath = (
  files: ProjectFileType[],
  fileId: string,
) => {
  const map = new Map(files.map((file) => [file.id, file]));

  const path: {
    id: string;
    name: string;
  }[] = [];

  let current = map.get(fileId);

  while (current) {
    path.unshift({
      id: current.id,
      name: current.name,
    });

    if (!current.parentId) break;

    current = map.get(current.parentId);
  }

  return path;
};