"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createFile, deleteFile, getFiles, updateFile } from "@/lib/api/apis/files/files";
import { socket } from "@/lib/socket/socket";
import { useFilesStore } from "@/store/file.store";
import { CreateFileRequest, UpdateFile } from "@/lib/api/apis/files/types";

// Track active requests per projectId to avoid duplicate requests within same instance
const activeRequests = new Map<string, AbortController>();

async function loadProjectFiles(
  projectId: string,
  options?: { force?: boolean },
) {
  // Cancel previous request if force is true
  if (options?.force && activeRequests.has(projectId)) {
    activeRequests.get(projectId)?.abort();
    activeRequests.delete(projectId);
  }

  // Check if already loading
  if (activeRequests.has(projectId) && !options?.force) {
    return;
  }

  // Check cache
  const { files } = useFilesStore.getState();
  if (!options?.force && projectId in files) {
    return;
  }

  const controller = new AbortController();
  activeRequests.set(projectId, controller);

  const { setLoading, setFiles } = useFilesStore.getState();

  try {
    setLoading(projectId, true);

    const res = await getFiles(projectId);
    setFiles(projectId, res.data.files);
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error(`[loadProjectFiles] Error loading files for ${projectId}:`, error);
    }
  } finally {
    setLoading(projectId, false);
    activeRequests.delete(projectId);
  }
}

export function reloadProjectFiles(projectId: string) {
  return loadProjectFiles(projectId, { force: true });
}

export const useLoadFiles = (projectId: string, enabled: boolean = true) => {
  const loading = useFilesStore(
    (s) => s.loadingProjects[projectId] ?? false,
  );

  const requestIdRef = useRef(0);
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    if (!enabled || !projectId) return;

    let cancelled = false;
    const requestId = ++requestIdRef.current;

    const load = async () => {
      try {
        await loadProjectFiles(projectId);
        if (!cancelled && requestId === requestIdRef.current) {
          setHasAttempted(true);
        }
      } catch (err) {
        if (!cancelled && requestId === requestIdRef.current) {
          console.error("[useLoadFiles] Error:", err);
          setHasAttempted(true);
        }
      }
    };

    load();

    const onConnect = () => {
      if (!cancelled && requestId === requestIdRef.current) {
        const { files } = useFilesStore.getState();
        if (!(projectId in files)) {
          load();
        }
      }
    };

    socket.on("connect", onConnect);

    return () => {
      cancelled = true;
      socket.off("connect", onConnect);
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

  return { loading, reload };
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

      console.log("dataaaaa", res.data.file);      
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

export const useDeleteFile = () => {
  const removeFile = useFilesStore((s) => s.removeFile);
  const [loading, setLoading] = useState(false);

  const mutate = async (
    projectId: string,
    fileId: string,
  ) => {
    try {
      setLoading(true);

      await deleteFile(projectId, fileId);

      removeFile(projectId, fileId);
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
