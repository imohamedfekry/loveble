import { create } from "zustand";
import type { FileContent, ProjectFileType } from "@/lib/api/apis/files/types";

interface FilesState {
  files: Record<string, ProjectFileType[]>;
  loadingProjects: Record<string, boolean>;

  // File content cache (keyed by fileId)
  fileContents: Record<string, FileContent>;
  contentLoading: Record<string, boolean>;
  contentErrors: Record<string, string>;

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

  setFileContent: (
    fileId: string,
    content: FileContent,
  ) => void;

  setContentLoading: (
    fileId: string,
    loading: boolean,
  ) => void;

  setContentError: (
    fileId: string,
    message: string,
  ) => void;

  clearFileContent: (
    fileId: string,
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

  fileContents: {},
  contentLoading: {},
  contentErrors: {},

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
    set((state) => {

      const current =
        state.files[projectId] ?? [];


      const exists =
        current.some(
          item => item.id === file.id
        );


      if (exists) {
        return state;
      }


      return {
        files: {
          ...state.files,
          [projectId]: [
            ...current,
            file
          ]
        }
      };

    }),
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

  setFileContent: (fileId, content) =>
    set((state) => ({
      fileContents: {
        ...state.fileContents,
        [fileId]: content,
      },
      contentErrors: {
        ...state.contentErrors,
        [fileId]: "",
      },
    })),

  setContentLoading: (fileId, loading) =>
    set((state) => ({
      contentLoading: {
        ...state.contentLoading,
        [fileId]: loading,
      },
    })),

  setContentError: (fileId, message) =>
    set((state) => ({
      contentErrors: {
        ...state.contentErrors,
        [fileId]: message,
      },
    })),

  clearFileContent: (fileId) =>
    set((state) => {
      const fileContents = { ...state.fileContents };
      const contentLoading = { ...state.contentLoading };
      const contentErrors = { ...state.contentErrors };

      delete fileContents[fileId];
      delete contentLoading[fileId];
      delete contentErrors[fileId];

      return {
        fileContents,
        contentLoading,
        contentErrors,
      };
    }),

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