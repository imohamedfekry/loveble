"use client";

import { useEffect, useMemo, useState } from "react";
import { createFile, deleteFile, getFiles, updateFile } from "@/lib/api/apis/files/files";
import { useFilesStore } from "@/store/file.store";
import { CreateFileRequest, UpdateFile } from "@/lib/api/apis/files/types";

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

      addFile(projectId, res.data);

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

      updateFileInStore(projectId, res.data);

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
