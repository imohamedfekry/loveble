import { create } from "zustand";
import type { ProjectFileType } from "@/lib/api/apis/files/types";

interface FilesState {
  files: Record<string, ProjectFileType[]>;
  loadingProjects: Record<string, boolean>;

  // Folder cache
  folderContents: Record<string, ProjectFileType[]>;
  folderLoading: Record<string, boolean>;
  loadedFolders: Record<string, boolean>;

  setFiles: (
    projectId: string,
    files: ProjectFileType[],
  ) => void;

  addFile: (
    projectId: string,
    file: ProjectFileType,
  ) => void;

  updateFile: (
    projectId: string,
    file: ProjectFileType,
  ) => void;

  removeFile: (
    projectId: string,
    id: string,
  ) => void;

  setLoading: (
    projectId: string,
    loading: boolean,
  ) => void;

  setFolderContents: (
    folderId: string,
    files: ProjectFileType[],
  ) => void;

  setFolderLoading: (
    folderId: string,
    loading: boolean,
  ) => void;

  setFolderLoaded: (
    folderId: string,
  ) => void;

  clearFolderCache: (
    folderId: string,
  ) => void;
}

export const useFilesStore = create<FilesState>((set) => ({
  files: {},
  loadingProjects: {},

  folderContents: {},
  folderLoading: {},
  loadedFolders: {},

  setFiles: (projectId, files) =>
    set((state) => ({
      files: {
        ...state.files,
        [projectId]: files,
      },
    })),

  addFile: (projectId, file) =>
    set((state) => ({
      files: {
        ...state.files,
        [projectId]: [
          ...(state.files[projectId] ?? []),
          file,
        ],
      },
    })),

  updateFile: (projectId, file) =>
    set((state) => ({
      files: {
        ...state.files,
        [projectId]: (state.files[projectId] ?? []).map((f) =>
          f.id === file.id ? file : f,
        ),
      },
    })),

  removeFile: (projectId, id) =>
    set((state) => ({
      files: {
        ...state.files,
        [projectId]: (state.files[projectId] ?? []).filter(
          (f) => f.id !== id,
        ),
      },
    })),

  setLoading: (projectId, loading) =>
    set((state) => ({
      loadingProjects: {
        ...state.loadingProjects,
        [projectId]: loading,
      },
    })),

  setFolderContents: (folderId, files) =>
    set((state) => ({
      folderContents: {
        ...state.folderContents,
        [folderId]: files,
      },
    })),

  setFolderLoading: (folderId, loading) =>
    set((state) => ({
      folderLoading: {
        ...state.folderLoading,
        [folderId]: loading,
      },
    })),

  setFolderLoaded: (folderId) =>
    set((state) => ({
      loadedFolders: {
        ...state.loadedFolders,
        [folderId]: true,
      },
    })),

  clearFolderCache: (folderId) =>
    set((state) => {
      const folderContents = { ...state.folderContents };
      const folderLoading = { ...state.folderLoading };
      const loadedFolders = { ...state.loadedFolders };

      delete folderContents[folderId];
      delete folderLoading[folderId];
      delete loadedFolders[folderId];

      return {
        folderContents,
        folderLoading,
        loadedFolders,
      };
    }),
}));