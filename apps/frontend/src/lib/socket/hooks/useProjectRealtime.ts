"use client";
// for inside project data
import { useEffect, useRef } from "react";
import { socket } from "../socket";
import { useFilesStore } from "@/store/file.store";
import type { ProjectFileType } from "@/lib/api/apis/files/types";
const SUBSCRIBE_MAX_RETRIES = 5;
const SUBSCRIBE_RETRY_BASE_MS = 700;

export const useProjectRealtime = (projectId: string | null | undefined) => {
  const subscribedProjectRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const clearRetry = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const subscribe = () => {
      if (!socket.connected) {
        return;
      }
      if (subscribedProjectRef.current === projectId) {
        return;
      }
      socket.emit("project:subscribe", projectId);
      subscribedProjectRef.current = projectId;
      console.log("project subscribe", projectId);
    };

    const scheduleRetry = () => {
      if (retryCountRef.current >= SUBSCRIBE_MAX_RETRIES) return;

      retryCountRef.current += 1;
      clearRetry();
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        subscribe();
      }, SUBSCRIBE_RETRY_BASE_MS * retryCountRef.current);
    };

    const unsubscribe = () => {
      if (subscribedProjectRef.current !== projectId) {
        return;
      }
      socket.emit("project:unsubscribe", projectId);
      subscribedProjectRef.current = null;
    };

    const onConnect = () => {
      retryCountRef.current = 0;
      subscribe();
    };

    const onDisconnect = () => {
      clearRetry();
      retryCountRef.current = 0;
      subscribedProjectRef.current = null;
    };

    const onSubscribed = (payload: { projectId?: string }) => {
      if (payload?.projectId === projectId) {
        clearRetry();
      }
    };

    const onProjectError = (err: unknown) => {
      console.error("[realtime] project subscribe failed:", err);

      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "";

      if (message === "Unauthorized") {
        subscribedProjectRef.current = null;
        scheduleRetry();
      }
    };

    if (socket.connected) {
      subscribe();
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("project:subscribed", onSubscribed);
    socket.on("project:error", onProjectError);

    return () => {
      clearRetry();
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("project:subscribed", onSubscribed);
      socket.off("project:error", onProjectError);
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
      console.log("file updated from sockets",payload);
      
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
