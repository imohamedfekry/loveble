import { Injectable, Logger } from '@nestjs/common';

export interface SerializedUpdate {
  clientID: string;
  changes: unknown;
}

export interface FileDocument {
  version: number;
  updates: SerializedUpdate[];
  document: string;
}

export type PushResult = {
  accepted: boolean;
  fromVersion: number;
  version: number;
  updates: SerializedUpdate[];
  document: string;
};

export type AwarenessSelection = {
  anchor: number;
  head: number;
};

export type AwarenessState = {
  socketId: string;
  userId: string;
  userName: string;
  selection: AwarenessSelection[] | null;
  mouse: { x: number; y: number } | null;
};

export type FileViewer = {
  socketId: string;
  userId: string;
  userName: string;
  fileId: string;
  projectId: string;
};

function normalizeSelection(
  selection: AwarenessSelection | AwarenessSelection[] | null | undefined,
): AwarenessSelection[] | null | undefined {
  if (selection === undefined) return undefined;
  if (selection == null) return null;
  const list = Array.isArray(selection) ? selection : [selection];
  const valid = list.filter(
    (range) =>
      range &&
      Number.isFinite(range.anchor) &&
      Number.isFinite(range.head),
  );
  return valid.length ? valid : null;
}

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);
  private documents = new Map<string, FileDocument>();
  private awareness = new Map<string, Map<string, AwarenessState>>();
  private occupancyBySocket = new Map<string, FileViewer>();

  getDocument(fileId: string, initialContent: string): FileDocument {
    if (!this.documents.has(fileId)) {
      this.documents.set(fileId, {
        version: 0,
        updates: [],
        document: initialContent,
      });
      this.logger.log(`Created new document for file: ${fileId}`);
    }
    return this.documents.get(fileId)!;
  }

  getSnapshot(fileId: string, initialContent: string): {
    version: number;
    document: string;
  } {
    const doc = this.getDocument(fileId, initialContent);
    return { version: doc.version, document: doc.document };
  }

  pushUpdates(
    fileId: string,
    baseVersion: number,
    updates: SerializedUpdate[],
    resultingDocument?: string,
  ): PushResult | null {
    const doc = this.documents.get(fileId);
    if (!doc) return null;

    if (
      typeof baseVersion !== 'number' ||
      !Number.isInteger(baseVersion) ||
      baseVersion < 0
    ) {
      return {
        accepted: false,
        fromVersion: 0,
        version: doc.version,
        updates: doc.updates.slice(),
        document: doc.document,
      };
    }

    if (baseVersion > doc.version) {
      return {
        accepted: false,
        fromVersion: doc.version,
        version: doc.version,
        updates: [],
        document: doc.document,
      };
    }

    if (baseVersion !== doc.version) {
      return {
        accepted: false,
        fromVersion: baseVersion,
        version: doc.version,
        updates: doc.updates.slice(baseVersion),
        document: doc.document,
      };
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return {
        accepted: true,
        fromVersion: baseVersion,
        version: doc.version,
        updates: [],
        document: doc.document,
      };
    }

    const valid = updates.every(
      (update) =>
        update &&
        typeof update.clientID === 'string' &&
        update.changes != null,
    );

    if (!valid) {
      return {
        accepted: false,
        fromVersion: baseVersion,
        version: doc.version,
        updates: [],
        document: doc.document,
      };
    }

    for (const update of updates) {
      doc.updates.push({
        clientID: update.clientID,
        changes: update.changes,
      });
    }

    doc.version = doc.updates.length;

    if (typeof resultingDocument === 'string') {
      doc.document = resultingDocument;
    }

    return {
      accepted: true,
      fromVersion: baseVersion,
      version: doc.version,
      updates,
      document: doc.document,
    };
  }

  getUpdatesSince(fileId: string, version: number): SerializedUpdate[] {
    const doc = this.documents.get(fileId);
    if (!doc) return [];
    if (version < 0) return doc.updates.slice();
    return doc.updates.slice(version);
  }

  setAwareness(
    fileId: string,
    state: {
      socketId: string;
      userId: string;
      userName: string;
      selection?: AwarenessSelection | AwarenessSelection[] | null;
      mouse?: { x: number; y: number } | null;
    },
  ): AwarenessState {
    if (!this.awareness.has(fileId)) {
      this.awareness.set(fileId, new Map());
    }

    const current = this.awareness.get(fileId)!.get(state.socketId);
    const next: AwarenessState = {
      socketId: state.socketId,
      userId: state.userId,
      userName: state.userName,
      selection:
        state.selection === undefined
          ? current?.selection ?? null
          : normalizeSelection(state.selection) ?? null,
      mouse: state.mouse === undefined ? current?.mouse ?? null : state.mouse,
    };

    this.awareness.get(fileId)!.set(state.socketId, next);
    return next;
  }

  listAwareness(fileId: string, exceptSocketId?: string): AwarenessState[] {
    const peers = this.awareness.get(fileId);
    if (!peers) return [];

    return [...peers.values()].filter(
      (peer) => peer.socketId !== exceptSocketId,
    );
  }

  joinFile(
    fileId: string,
    projectId: string,
    socketId: string,
    userId: string,
    userName: string,
  ): { viewer: FileViewer; left: FileViewer[] } {
    const left = this.leaveSocket(socketId);

    const viewer: FileViewer = {
      socketId,
      userId,
      userName,
      fileId,
      projectId,
    };
    this.occupancyBySocket.set(socketId, viewer);
    return { viewer, left };
  }

  leaveFile(fileId: string, socketId: string): FileViewer | null {
    const current = this.occupancyBySocket.get(socketId);
    if (!current || current.fileId !== fileId) return null;
    this.occupancyBySocket.delete(socketId);
    return current;
  }

  leaveSocket(socketId: string): FileViewer[] {
    const current = this.occupancyBySocket.get(socketId);
    if (!current) return [];
    this.occupancyBySocket.delete(socketId);
    return [current];
  }

  listProjectViewers(projectId: string): FileViewer[] {
    return [...this.occupancyBySocket.values()].filter(
      (viewer) => viewer.projectId === projectId,
    );
  }

  removeAwareness(fileId: string, socketId: string): boolean {
    const peers = this.awareness.get(fileId);
    if (!peers) return false;

    const removed = peers.delete(socketId);
    if (peers.size === 0) {
      this.awareness.delete(fileId);
    }
    return removed;
  }

  removeDocument(fileId: string) {
    this.documents.delete(fileId);
    this.awareness.delete(fileId);
    this.logger.log(`Removed document for file: ${fileId}`);
  }
}
