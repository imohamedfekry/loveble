"use client";
// for inside project data
import { useEffect, useRef } from "react";
import { socket } from "../socket";
import { useFilesStore } from "@/store/file.store";
import { useFilePresenceStore, type FileViewer } from "@/store/file-presence.store";
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
      console.log("[realtime] subscribe project", { projectId });
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
      console.log("[realtime] unsubscribe project", { projectId });
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
        console.log("[realtime] subscribed to project", payload);
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

      console.log("[realtime] received file created", {
        fileId: file.id,
        projectId: file.projectId,
        name: file.name,
      });
      useFilesStore.getState().addFile(file.projectId, file);
    };

    const onUpdated = (payload: ProjectFileType) => {
      const projectId = payload.projectId;
      console.log("[realtime] received file updated", {
        fileId: payload.id,
        projectId,
        name: payload.name,
      });
      useFilesStore.getState().updateFile(projectId, payload);
    };

    const onDeleted = (payload: ProjectFileType) => {
      const fileId = payload.id;
      const projectId = payload.projectId;

      console.log("[realtime] received file deleted", { fileId, projectId });
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

  useEffect(() => {
    const onPresenceState = (payload: {
      projectId?: string;
      viewers: FileViewer[];
    }) => {
      if (!projectId || payload.projectId !== projectId) return;
      console.log("[realtime] presence state", payload.viewers.length, "viewers");
      useFilePresenceStore.getState().setViewers(payload.viewers);
    };

    const onPresence = (payload: {
      type: "join" | "leave";
      viewer?: FileViewer;
      socketId?: string;
      fileId?: string;
      projectId?: string;
    }) => {
      const payloadProjectId = payload.projectId ?? payload.viewer?.projectId;
      if (!projectId || payloadProjectId !== projectId) return;

      if (payload.type === "join" && payload.viewer) {
        console.log("[realtime] presence join", payload.viewer);
        useFilePresenceStore.getState().addViewer(payload.viewer);
      } else if (payload.type === "leave" && payload.socketId) {
        console.log("[realtime] presence leave", payload.socketId);
        useFilePresenceStore.getState().removeViewer(
          payload.socketId,
          payload.fileId,
        );
      }
    };

    socket.on("file:presence-state", onPresenceState);
    socket.on("file:presence", onPresence);

    return () => {
      socket.off("file:presence-state", onPresenceState);
      socket.off("file:presence", onPresence);
      useFilePresenceStore.getState().clear();
    };
  }, [projectId]);
};
