"use client";

import { useEffect, useMemo, useState } from "react";
import { createFile, deleteFile, getFileContent, getFiles, moveFile, updateFile } from "@/lib/api/apis/files/files";
import { useFilesStore } from "@/store/file.store";
import { CreateFileRequest, ProjectFileType, UpdateFile } from "@/lib/api/apis/files/types";

const inflightLoads = new Map<string, Promise<void>>();

async function loadProjectFiles(
  projectId: string,
  options?: { force?: boolean },
) {
  if (!options?.force) {
    const existing = inflightLoads.get(projectId);
    if (existing) return existing;

    const { files } = useFilesStore.getState();
    if (projectId in files) return;
  } else {
    inflightLoads.delete(projectId);
  }

  const promise = (async () => {
    const { setLoading, setFiles } = useFilesStore.getState();

    try {
      setLoading(projectId, true);

      const res = await getFiles(projectId);
      setFiles(projectId, res.data.files);
    } finally {
      setLoading(projectId, false);
      inflightLoads.delete(projectId);
    }
  })();

  inflightLoads.set(projectId, promise);
  return promise;
}

export function reloadProjectFiles(projectId: string) {
  return loadProjectFiles(projectId, { force: true });
}

export const useLoadFiles = (projectId: string, enabled: boolean = true) => {
  const loading = useFilesStore(
    (s) => s.loadingProjects[projectId] ?? false,
  );

  useEffect(() => {
    if (!enabled || !projectId) return;

    const { files } = useFilesStore.getState();
    if (projectId in files) return;

    let cancelled = false;

    loadProjectFiles(projectId).catch((err) => {
      if (!cancelled) {
        console.error(err);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, projectId]);

  return { loading };
};

export const useReloadFiles = () => {
  const [loading, setLoading] = useState(false);

  const reload = async (projectId: string) => {
    try {
      setLoading(true);
      await reloadProjectFiles(projectId);
    } finally {
      setLoading(false);
    }
  };

  return { reload, loading };
};

export const useCreateFile = () => {
  const addFile = useFilesStore((s) => s.addFile);
  const [loading, setLoading] = useState(false);

  const mutate = async (
    projectId: string,
    body: CreateFileRequest,
  ) => {
    try {
      setLoading(true);
      const res = await createFile(projectId, body);      
      addFile(projectId, res.data.file);
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  return {
    createFile: mutate,
    loading,
  };
};

export const useUpdateFile = () => {
  const updateFileInStore = useFilesStore((s) => s.updateFile);
  const [loading, setLoading] = useState(false);

  const mutate = async (
    projectId: string,
    fileId: string,
    body: UpdateFile,
  ) => {
    try {
      setLoading(true);
      const res = await updateFile(projectId, fileId, body);
      updateFileInStore(projectId, res.data.file);

      console.log("dataaaaa",res.data.file);      
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateFile: mutate,
    loading,
  };
};

export const useMoveFile = () => {
  const updateFileInStore = useFilesStore((s) => s.updateFile);
  const [loading, setLoading] = useState(false);

  const mutate = async (
    projectId: string,
    fileId: string,
    parentId: string | null,
  ) => {
    try {
      setLoading(true);
      const res = await moveFile(projectId, fileId, { parentId });
      updateFileInStore(projectId, res.data.file);
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  return {
    moveFile: mutate,
    loading,
  };
};

export const useDeleteFile = () => {
  const removeFile = useFilesStore((s) => s.removeFile);
  const clearFileContent = useFilesStore((s) => s.clearFileContent);
  const [loading, setLoading] = useState(false);

  const mutate = async (
    projectId: string,
    fileId: string,
  ) => {
    try {
      setLoading(true);

      await deleteFile(projectId, fileId);

      removeFile(projectId, fileId);
      clearFileContent(fileId);
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteFile: mutate,
    loading,
  };
};

export const useLoadFolderContent = (
  projectId: string,
  folderId: string | null,
  enabled: boolean = true,
) => {
  const files = useFilesStore((s) => s.files);
  const loading = useFilesStore(
    (s) => s.loadingProjects[projectId] ?? false,
  );

  const folderContents = useMemo(() => {
    if (!enabled) return [];

    return (files[projectId] ?? []).filter(
      (file) => file.parentId === folderId,
    );
  }, [files, projectId, folderId, enabled]);

  return {
    files: folderContents,
    loading,
  };
};
const EMPTY_FILES: ProjectFileType[] = [];

const inflightContentLoads = new Map<string, Promise<void>>();
const MIN_CONTENT_LOADING_MS = 250;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const useFileContent = (
  projectId: string,
  fileId: string | null | undefined,
) => {
  const content = useFilesStore(
    (s) => (fileId ? s.fileContents[fileId] : undefined),
  );
  const loading = useFilesStore(
    (s) => (fileId ? s.contentLoading[fileId] ?? false : false),
  );
  const error = useFilesStore(
    (s) => (fileId ? s.contentErrors[fileId] : undefined),
  );

  useEffect(() => {
    if (!projectId || !fileId) return;

    const { fileContents, contentLoading, contentErrors } =
      useFilesStore.getState();

    if (fileId in fileContents || contentLoading[fileId]) return;
    if (contentErrors[fileId]) return;

    const existing = inflightContentLoads.get(fileId);
    if (existing) return;

    const promise = (async () => {
      const { setContentLoading, setFileContent, setContentError } =
        useFilesStore.getState();

      const startedAt = Date.now();

      try {
        setContentLoading(fileId, true);

        const res = await getFileContent(projectId, fileId);
        setFileContent(fileId, res.data.file);
      } catch (err) {
        setContentError(
          fileId,
          err instanceof Error ? err.message : "Failed to load file content",
        );
      } finally {
        const elapsed = Date.now() - startedAt;
        const remaining = MIN_CONTENT_LOADING_MS - elapsed;

        if (remaining > 0) {
          await sleep(remaining);
        }

        setContentLoading(fileId, false);
        inflightContentLoads.delete(fileId);
      }
    })();

    inflightContentLoads.set(fileId, promise);
  }, [projectId, fileId]);

  return { content, loading, error };
};

export const useFile = (
  projectId: string,
  fileId: string | null | undefined,
) => {
  const files = useFilesStore(
    (state) => state.files[projectId] ?? EMPTY_FILES,
  );

  return useMemo(() => {
    if (!fileId) return undefined;
    return files.find((file) => file.id === fileId);
  }, [files, fileId]);
};