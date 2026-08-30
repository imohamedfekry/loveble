"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorView } from "@codemirror/view";
import {
  collab,
  receiveUpdates,
  sendableUpdates,
  getSyncedVersion,
} from "@codemirror/collab";
import { socket } from "@/lib/socket/socket";
import { useSocketStatus } from "@/lib/socket/socket-store";
import {
  deserializeUpdate,
  distinguishSameAccountPeers,
  selectUpdatesToApply,
  toRemotePeer,
  type CollabPayload,
  type RemotePeer,
} from "@/lib/socket/collab-protocol";
import { useUserStore } from "@/store/user.store";

const COLLAB_EVENTS = {
  JOIN: "file:collab:join",
  LEAVE: "file:collab:leave",
  UPDATE: "file:collab:update",
  SYNC: "file:collab:sync",
  AWARENESS: "file:collab:awareness",
  AWARENESS_STATE: "file:collab:awareness-state",
};

function collabLog(event: string, details?: Record<string, unknown>) {
  if (details) {
    console.log(`[collab] ${event}`, details);
    return;
  }
  console.log(`[collab] ${event}`);
}

interface UseCollaborationOptions {
  fileId: string | null;
  projectId: string;
  initialContent: string;
  clientID: string;
}

export interface CollabSnapshot {
  version: number;
  document: string;
}

export function collabExtension(config: {
  startVersion: number;
  clientID: string;
}) {
  return collab(config);
}

function applyIncoming(view: EditorView, payload: CollabPayload) {
  const synced = getSyncedVersion(view.state);
  const remaining = selectUpdatesToApply(
    synced,
    payload.fromVersion ?? synced,
    payload.version,
    payload.updates ?? [],
  );
  if (remaining.length === 0) return;

  const updates = remaining.map(deserializeUpdate);
  view.dispatch(receiveUpdates(view.state, updates));
}

export function useCollaboration({
  fileId,
  projectId,
  initialContent,
}: UseCollaborationOptions) {
  const viewRef = useRef<EditorView | null>(null);
  const fileIdRef = useRef<string | null>(null);
  const pushingRef = useRef(false);
  const pushGenRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketStatus = useSocketStatus();
  const localUserId = useUserStore((s) => s.user?.id);
  const [snapshot, setSnapshot] = useState<CollabSnapshot | null>(null);
  const [peers, setPeers] = useState<Record<string, RemotePeer>>({});
  const pendingAwarenessRef = useRef<{
    selection?: RemotePeer["selection"];
    mouse?: { x: number; y: number } | null;
  }>({});
  const awarenessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setView = useCallback((view: EditorView | null) => {
    viewRef.current = view;
  }, []);

  useEffect(() => {
    if (!fileId || socketStatus !== "connected") {
      setSnapshot(null);
      return;
    }

    if (fileIdRef.current && fileIdRef.current !== fileId) {
      collabLog("leave file", { fileId: fileIdRef.current });
      socket.emit(COLLAB_EVENTS.LEAVE, { fileId: fileIdRef.current });
    }

    fileIdRef.current = fileId;
    setSnapshot(null);
    setPeers({});

    collabLog("join file", { fileId, projectId });
    socket.emit(COLLAB_EVENTS.JOIN, {
      fileId,
      projectId,
      initialContent,
    });

    return () => {
      if (fileIdRef.current) {
        collabLog("leave file", { fileId: fileIdRef.current });
        socket.emit(COLLAB_EVENTS.LEAVE, { fileId: fileIdRef.current });
        fileIdRef.current = null;
      }
      if (awarenessTimerRef.current) {
        clearTimeout(awarenessTimerRef.current);
        awarenessTimerRef.current = null;
      }
      setSnapshot(null);
      setPeers({});
    };
  }, [fileId, projectId, initialContent, socketStatus]);

  useEffect(() => {
    const onSync = (payload: {
      fileId: string;
      version: number;
      document: string;
      fromVersion?: number;
      updates?: CollabPayload["updates"];
    }) => {
      if (payload.fileId !== fileIdRef.current) return;

      const view = viewRef.current;
      if (view && payload.updates?.length) {
        collabLog("received sync catch-up", {
          fileId: payload.fileId,
          version: payload.version,
          fromVersion: payload.fromVersion ?? 0,
          updates: payload.updates.length,
        });
        try {
          applyIncoming(view, {
            fileId: payload.fileId,
            fromVersion: payload.fromVersion ?? 0,
            version: payload.version,
            updates: payload.updates,
          });
        } catch (err) {
          console.error("[collab] error applying sync updates:", err);
        }
        return;
      }

      collabLog("received snapshot", {
        fileId: payload.fileId,
        version: payload.version,
        documentLength: payload.document?.length ?? 0,
      });
      setSnapshot({
        version: payload.version,
        document: payload.document,
      });
    };

    const onUpdate = (payload: CollabPayload) => {
      const view = viewRef.current;
      if (!view || payload.fileId !== fileIdRef.current) return;

      collabLog("received remote update", {
        fileId: payload.fileId,
        accepted: payload.accepted,
        fromVersion: payload.fromVersion,
        version: payload.version,
        updates: payload.updates?.length ?? 0,
      });

      try {
        applyIncoming(view, payload);
      } catch (err) {
        console.error("[collab] error applying remote updates:", err);
      }
    };

    const onAwareness = (payload: {
      fileId: string;
      type?: "update" | "leave";
      socketId: string;
      userId?: string;
      userName?: string;
      selection?: RemotePeer["selection"];
      mouse?: RemotePeer["mouse"];
    }) => {
      if (payload.fileId !== fileIdRef.current) return;

      if (payload.type === "leave") {
        collabLog("peer left file", {
          fileId: payload.fileId,
          socketId: payload.socketId,
          userName: payload.userName,
        });
        setPeers((current) => {
          if (!(payload.socketId in current)) return current;
          const next = { ...current };
          delete next[payload.socketId];
          return next;
        });
        return;
      }

      setPeers((current) => {
        const existing = current[payload.socketId];
        if (!existing) {
          collabLog("peer joined file", {
            fileId: payload.fileId,
            socketId: payload.socketId,
            userId: payload.userId,
            userName: payload.userName,
          });
        }
        const nextPeer = toRemotePeer({
          socketId: payload.socketId,
          userId: payload.userId ?? existing?.userId,
          userName: payload.userName ?? existing?.userName,
          selection:
            payload.selection !== undefined
              ? payload.selection
              : existing?.selection ?? null,
          mouse:
            payload.mouse !== undefined ? payload.mouse : existing?.mouse ?? null,
        });

        return { ...current, [payload.socketId]: nextPeer };
      });
    };

    const onAwarenessState = (payload: {
      fileId: string;
      peers: Array<{
        socketId: string;
        userId?: string;
        userName?: string;
        selection?: RemotePeer["selection"];
        mouse?: RemotePeer["mouse"];
      }>;
    }) => {
      if (payload.fileId !== fileIdRef.current) return;

      collabLog("received presence list", {
        fileId: payload.fileId,
        peers: (payload.peers ?? []).map((peer) => ({
          socketId: peer.socketId,
          userName: peer.userName,
        })),
      });

      const next: Record<string, RemotePeer> = {};
      for (const peer of payload.peers ?? []) {
        next[peer.socketId] = toRemotePeer(peer);
      }
      setPeers(next);
    };

    socket.on(COLLAB_EVENTS.SYNC, onSync);
    socket.on(COLLAB_EVENTS.UPDATE, onUpdate);
    socket.on(COLLAB_EVENTS.AWARENESS, onAwareness);
    socket.on(COLLAB_EVENTS.AWARENESS_STATE, onAwarenessState);

    return () => {
      socket.off(COLLAB_EVENTS.SYNC, onSync);
      socket.off(COLLAB_EVENTS.UPDATE, onUpdate);
      socket.off(COLLAB_EVENTS.AWARENESS, onAwareness);
      socket.off(COLLAB_EVENTS.AWARENESS_STATE, onAwarenessState);
    };
  }, []);

  const flushUpdates = useCallback(() => {
    const view = viewRef.current;
    if (!view || !fileIdRef.current || pushingRef.current) return;
    if (socketStatus !== "connected") return;

    let updates: ReturnType<typeof sendableUpdates>;
    try {
      updates = sendableUpdates(view.state);
    } catch {
      return;
    }

    if (updates.length === 0) return;

    const pushGen = ++pushGenRef.current;
    pushingRef.current = true;

    const payload = {
      fileId: fileIdRef.current,
      updates: updates.map((u) => ({
        changes: u.changes.toJSON(),
        clientID: u.clientID,
      })),
      version: getSyncedVersion(view.state),
      document: view.state.doc.toString(),
    };

    collabLog("sending update", {
      fileId: payload.fileId,
      version: payload.version,
      updates: payload.updates.length,
    });

    const ackTimeout = setTimeout(() => {
      if (pushGenRef.current === pushGen) {
        pushingRef.current = false;
      }
    }, 2000);

    socket.emit(COLLAB_EVENTS.UPDATE, payload, (ack?: CollabPayload) => {
      if (pushGenRef.current !== pushGen) return;
      clearTimeout(ackTimeout);
      try {
        const currentView = viewRef.current;
        if (ack && currentView) {
          const synced = getSyncedVersion(currentView.state);
          const authorityReset =
            ack.accepted === false &&
            typeof ack.document === "string" &&
            ack.version < synced &&
            (ack.updates?.length ?? 0) === 0;

          collabLog("received update ack", {
            fileId: ack.fileId,
            accepted: ack.accepted,
            fromVersion: ack.fromVersion,
            version: ack.version,
            updates: ack.updates?.length ?? 0,
            authorityReset,
          });

          if (authorityReset) {
            setSnapshot({
              version: ack.version,
              document: ack.document!,
            });
          } else {
            applyIncoming(currentView, {
              ...ack,
              fromVersion: ack.fromVersion ?? synced,
              updates: ack.updates ?? [],
            });
          }
        }
      } catch (err) {
        console.error("[collab] error applying ack updates:", err);
      } finally {
        pushingRef.current = false;
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushTimerRef.current = setTimeout(() => {
          flushUpdates();
        }, 50);
      }
    });
  }, [socketStatus]);

  useEffect(() => {
    if (!snapshot) return;

    const interval = setInterval(flushUpdates, 100);

    return () => {
      clearInterval(interval);
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      pushingRef.current = false;
    };
  }, [snapshot, flushUpdates]);

  const sendAwareness = useCallback((awareness: {
    selection?: RemotePeer["selection"];
    mouse?: { x: number; y: number } | null;
  }) => {
    if (!fileIdRef.current) return;

    pendingAwarenessRef.current = {
      ...pendingAwarenessRef.current,
      ...awareness,
    };

    if (awarenessTimerRef.current) return;

    awarenessTimerRef.current = setTimeout(() => {
      awarenessTimerRef.current = null;
      if (!fileIdRef.current) return;

      socket.emit(COLLAB_EVENTS.AWARENESS, {
        fileId: fileIdRef.current,
        awareness: pendingAwarenessRef.current,
      });
    }, 40);
  }, []);

  const peerList = useMemo(
    () =>
      distinguishSameAccountPeers(
        Object.values(peers),
        socketStatus === "connected" && socket.id && localUserId
          ? { socketId: socket.id, userId: String(localUserId) }
          : null,
      ),
    [peers, socketStatus, localUserId],
  );

  return { setView, sendAwareness, snapshot, peers: peerList };
}
