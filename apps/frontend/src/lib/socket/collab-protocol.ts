import { ChangeSet } from "@codemirror/state";
import type { Update } from "@codemirror/collab";

export type SerializedCollabUpdate = {
  clientID: string;
  changes: unknown;
};

export type CollabPayload = {
  fileId: string;
  accepted?: boolean;
  fromVersion: number;
  version: number;
  updates: SerializedCollabUpdate[];
  document?: string;
};

export function deserializeUpdate(u: SerializedCollabUpdate): Update {
  return {
    changes: ChangeSet.fromJSON(u.changes),
    clientID: u.clientID,
  };
}

export function selectUpdatesToApply<T>(
  syncedVersion: number,
  fromVersion: number,
  authorityVersion: number,
  updates: T[],
): T[] {
  if (!updates.length || authorityVersion <= syncedVersion) {
    return [];
  }

  const skip = Math.max(0, syncedVersion - fromVersion);
  return updates.slice(skip);
}

export type PresenceSelection = {
  anchor: number;
  head: number;
};

export function serializeSelections(
  ranges: ReadonlyArray<{ anchor: number; head: number }>,
  mainIndex = 0,
): PresenceSelection[] {
  if (!ranges.length) {
    return [{ anchor: 0, head: 0 }];
  }

  const safeMain = Math.min(Math.max(0, mainIndex), ranges.length - 1);
  const ordered = [ranges[safeMain], ...ranges.filter((_, index) => index !== safeMain)];

  return ordered.map((range) => ({
    anchor: range.anchor,
    head: range.head,
  }));
}

export function normalizeSelections(
  input: PresenceSelection | PresenceSelection[] | null | undefined,
): PresenceSelection[] | null {
  if (input == null) return null;

  const list = Array.isArray(input) ? input : [input];
  const valid = list.filter(
    (range) =>
      range &&
      Number.isFinite(range.anchor) &&
      Number.isFinite(range.head),
  );

  return valid.length ? valid : null;
}

export type PresenceMouse = {
  x: number;
  y: number;
};

export type RemotePeer = {
  socketId: string;
  userId: string;
  userName: string;
  displayName: string;
  color: string;
  selection: PresenceSelection[] | null;
  mouse: PresenceMouse | null;
};

export function peerColor(id: string, slot = 0): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hue = (Math.abs(hash) + slot * 71) % 360;
  const saturation = 74 + (slot % 2) * 8;
  const lightness = 52 + (slot % 3) * 5;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export function distinguishSameAccountPeers(
  peers: RemotePeer[],
  local?: { socketId: string; userId: string } | null,
): RemotePeer[] {
  const socketIdsByUser = new Map<string, string[]>();

  const track = (userId: string, socketId: string) => {
    if (!userId || !socketId) return;
    const sockets = socketIdsByUser.get(userId) ?? [];
    if (!sockets.includes(socketId)) sockets.push(socketId);
    socketIdsByUser.set(userId, sockets);
  };

  for (const peer of peers) {
    track(peer.userId, peer.socketId);
  }
  if (local) {
    track(local.userId, local.socketId);
  }

  return peers.map((peer) => {
    const sockets = socketIdsByUser.get(peer.userId) ?? [peer.socketId];
    const index = Math.max(0, sockets.indexOf(peer.socketId));
    const duplicated = sockets.length > 1;

    return {
      ...peer,
      displayName:
        duplicated && index > 0 ? `${peer.userName} ${index + 1}` : peer.userName,
      color: peerColor(peer.socketId, duplicated ? index : 0),
    };
  });
}

export function clampDocPos(pos: number, length: number): number {
  if (!Number.isFinite(pos)) return 0;
  return Math.max(0, Math.min(length, Math.floor(pos)));
}

export function toRemotePeer(input: {
  socketId: string;
  userId?: string;
  userName?: string;
  selection?: PresenceSelection | PresenceSelection[] | null;
  mouse?: PresenceMouse | null;
}): RemotePeer {
  const socketId = input.socketId;
  const userName = input.userName?.trim() || "User";
  return {
    socketId,
    userId: String(input.userId ?? socketId),
    userName,
    displayName: userName,
    color: peerColor(socketId),
    selection: normalizeSelections(input.selection),
    mouse: input.mouse ?? null,
  };
}
