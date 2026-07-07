"use client";

import { useEffect, useRef } from "react";
import { socket } from "../socket";
import { useFilesStore } from "@/store/file.store";
import type { ProjectFileType } from "@/lib/api/apis/files/types";

export const useProjectRealtime = (projectId: string | null | undefined) => {
  const subscribedProjectRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const subscribe = () => {
      if (!socket.connected) {
        return;
      }
      if (subscribedProjectRef.current === projectId) {
        return;
      }
      socket.emit("project:subscribe", projectId);
      subscribedProjectRef.current = projectId;
    };

    const unsubscribe = () => {
      if (subscribedProjectRef.current !== projectId) {        
        return;
      }
      socket.emit("project:unsubscribe", projectId);
      subscribedProjectRef.current = null;
    };

    if (socket.connected) {
      subscribe();
    }

    socket.on("connect", subscribe);

    return () => {
      socket.off("connect", subscribe);
      unsubscribe();
    };
  }, [projectId]);

  useEffect(() => {
    const onCreated = (payload: ProjectFileType) => {
      const file = payload;
      if (!file?.id || !file.projectId) return;

      useFilesStore.getState().addFile(file.projectId, file);
    };

    const onUpdated = (payload: ProjectFileType) => {
      const projectId = payload.projectId
      useFilesStore.getState().updateFile(projectId, payload);
    };

    const onDeleted = (payload: ProjectFileType) => {
      const fileId = payload.id 
      const projectId = payload.projectId 
      
      useFilesStore.getState().removeFile(projectId, fileId);
    };

    socket.on("file:created", onCreated);
    socket.on("file:updated", onUpdated);
    socket.on("file:deleted", onDeleted);

    return () => {
      socket.off("file:created", onCreated);
      socket.off("file:updated", onUpdated);
      socket.off("file:deleted", onDeleted);
    };
  }, [projectId]);
};
