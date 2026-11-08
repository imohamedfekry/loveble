"use client";
// for inside project data
import { useEffect, useRef } from "react";
import { socket } from "../socket";
import { useFilesStore } from "@/store/file.store";
import { useEditorStore } from "@/store/use-editor-store";
import { useFilePresenceStore, type FileViewer } from "@/store/file-presence.store";
import { useMessagesStore, type Message } from "@/store/messages.store";
import { useConversationsStore } from "@/store/conversations.store";
import type { ProjectFileType } from "@/lib/api/apis/files/types";
const SUBSCRIBE_MAX_RETRIES = 5;
const SUBSCRIBE_RETRY_BASE_MS = 700;

type RealtimeId = string | number | bigint;

type RealtimeMessagePayload = {
  id?: RealtimeId;
  conversationId?: RealtimeId;
  projectId?: RealtimeId;
  content?: unknown;
  role?: unknown;
  status?: unknown;
  parts?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type RealtimeStreamPayload = {
  conversationId?: RealtimeId;
  messageId?: unknown;
  projectId?: RealtimeId;
  role?: unknown;
  status?: unknown;
  parts?: unknown;
};

type RealtimeConversationPayload = {
  id?: RealtimeId;
  conversationId?: RealtimeId;
  title?: unknown;
};

type MessageRole = Message["role"];

/** Snowflake ids arrive as strings or numbers over the wire. */
function toBigInt(value: RealtimeId | null | undefined): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? BigInt(value) : null;
  }
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return BigInt(value);
  }
  return null;
}

function toRole(value: unknown): MessageRole | null {
  return value === "user" || value === "assistant" || value === "system"
    ? value
    : null;
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toMessage(
  payload: RealtimeMessagePayload,
  conversationId: bigint,
): Message | null {
  const id = toBigInt(payload.id);
  const projectId = toBigInt(payload.projectId);
  const role = toRole(payload.role);

  if (id === null || projectId === null || role === null) return null;

  return {
    id,
    conversationId,
    projectId,
    content: toStringValue(payload.content),
    role,
    status: toStringValue(payload.status),
    createdAt: toStringValue(payload.createdAt),
    updatedAt: toStringValue(payload.updatedAt),
    parts: Array.isArray(payload.parts) ? payload.parts : undefined,
  };
}

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
      useFilePresenceStore.getState().clear();
    };

    const onSubscribed = (payload: { projectId?: string }) => {
      if (payload?.projectId === projectId) {
        clearRetry();
      }
    };

    const onSandboxReady = (payload: { sandboxId?: string }) => {
      if (!payload?.sandboxId) return;

      console.log(
        `[realtime] sandbox:ready — project ${projectId} → ${payload.sandboxId}`,
      );

      useEditorStore.getState().setSandboxState(projectId, {
        status: "ready",
        sandboxId: payload.sandboxId,
        error: undefined,
      });
    };

    const onProjectError = (err: unknown) => {
      console.error("[realtime] project subscribe failed:", err);

      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "";

      // Any failure (missing message included) → clear state and retry;
      // retry is capped at SUBSCRIBE_MAX_RETRIES.
      if (message === "Unauthorized" || !message) {
        subscribedProjectRef.current = null;
        scheduleRetry();
      }
    };

    const onException = (err: unknown) => {
      console.error("[realtime] ws exception:", err);
    };

    if (socket.connected) {
      subscribe();
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("project:subscribed", onSubscribed);
    socket.on("sandbox:ready", onSandboxReady);
    socket.on("project:error", onProjectError);
    socket.on("exception", onException);

    return () => {
      clearRetry();
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("project:subscribed", onSubscribed);
      socket.off("sandbox:ready", onSandboxReady);
      socket.off("project:error", onProjectError);
      socket.off("exception", onException);
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
      const fileProjectId = payload.projectId;
      useFilesStore.getState().updateFile(fileProjectId, payload);
    };

    const onDeleted = (payload: ProjectFileType) => {
      const fileId = payload.id;
      const fileProjectId = payload.projectId;
      useFilesStore.getState().removeFile(fileProjectId, fileId);
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
        useFilePresenceStore.getState().addViewer(payload.viewer);
      } else if (payload.type === "leave" && payload.socketId) {
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

  useEffect(() => {
    if (!projectId) return;

    const onMessageNew = (payload: RealtimeMessagePayload) => {
      const conversationId = toBigInt(payload?.conversationId);
      if (conversationId === null) return;

      const message = toMessage(payload, conversationId);
      if (!message) return;

      useMessagesStore.getState().addMessage(conversationId, message);
      // The finalized row replaces any in-flight stream for this conversation.
      // Only assistant finals prune: a user `message:new` echo (which the
      // sender also receives, since `server.to()` includes the emitter) would
      // otherwise wipe the assistant stream that is still being persisted.
      if (message.role !== "user") {
        useMessagesStore.getState().pruneStreams(conversationId);
      }
      // A new message makes its conversation the most recently active one.
      useConversationsStore
        .getState()
        .bumpConversation(String(conversationId));
    };

    const onConversationStream = (payload: RealtimeStreamPayload) => {
      const conversationId = toBigInt(payload?.conversationId);
      if (conversationId === null) return;
      if (typeof payload?.messageId !== "string" || !payload.messageId) return;

      useMessagesStore.getState().upsertStreamMessage(conversationId, {
        messageId: payload.messageId,
        conversationId,
        projectId: toBigInt(payload.projectId) ?? BigInt(0),
        role: payload.role === "user" ? "user" : payload.role === "system" ? "system" : "assistant",
        parts: Array.isArray(payload.parts) ? payload.parts : [],
        status:
          typeof payload.status === "string" ? payload.status : "streaming",
      });

      if (payload.status === "error") {
        window.setTimeout(() => {
          useMessagesStore.getState().pruneStreams(conversationId);
        }, 8000);
      }
    };

    const onMessageUpdated = (payload: RealtimeMessagePayload) => {
      const conversationId = toBigInt(payload?.conversationId);
      if (conversationId === null) return;

      const message = toMessage(payload, conversationId);
      if (!message) return;

      useMessagesStore.getState().updateMessage(conversationId, message);
    };

    const onConversationCreated = (payload: RealtimeConversationPayload) => {
      const id = toBigInt(payload?.id);
      if (id === null) return;

      useConversationsStore.getState().addConversation({
        id: String(id),
        title: typeof payload.title === "string" ? payload.title : null,
      });
    };

    const onConversationUpdated = (payload: RealtimeConversationPayload) => {
      const id = toBigInt(payload?.id);
      if (id === null || typeof payload.title !== "string") return;

      useConversationsStore
        .getState()
        .updateConversation(String(id), payload.title);
    };

    const onConversationDeleted = (payload: RealtimeConversationPayload) => {
      const id = toBigInt(payload?.conversationId ?? payload?.id);
      if (id === null) return;
      useConversationsStore.getState().removeConversation(String(id));
    };

    socket.on("message:new", onMessageNew);
    socket.on("message:updated", onMessageUpdated);
    socket.on("conversation:stream", onConversationStream);
    socket.on("conversation:created", onConversationCreated);
    socket.on("conversation:updated", onConversationUpdated);
    socket.on("conversation:deleted", onConversationDeleted);

    return () => {
      socket.off("message:new", onMessageNew);
      socket.off("message:updated", onMessageUpdated);
      socket.off("conversation:stream", onConversationStream);
      socket.off("conversation:created", onConversationCreated);
      socket.off("conversation:updated", onConversationUpdated);
      socket.off("conversation:deleted", onConversationDeleted);
    };
  }, [projectId]);
};
