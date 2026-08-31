import { Injectable, Logger } from '@nestjs/common';

import {
  AwarenessService,
  AwarenessSelection,
  AwarenessState,
} from './awareness.service';

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

export type FileViewer = {
  socketId: string;
  userId: string;
  userName: string;
  fileId: string;
  projectId: string;
};

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);
  private documents = new Map<string, FileDocument>();
  private occupancyBySocket = new Map<string, FileViewer>();

  constructor(private readonly awarenessService: AwarenessService) {}

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

  async setAwareness(
    fileId: string,
    state: {
      socketId: string;
      userId: string;
      userName: string;
      selection?: AwarenessSelection | AwarenessSelection[] | null;
      mouse?: { x: number; y: number } | null;
    },
  ): Promise<AwarenessState> {
    return this.awarenessService.setAwareness(fileId, state);
  }

  async listAwareness(
    fileId: string,
    exceptSocketId?: string,
  ): Promise<AwarenessState[]> {
    return this.awarenessService.listAwareness(fileId, exceptSocketId);
  }

  async removeAwareness(fileId: string, socketId: string): Promise<boolean> {
    return this.awarenessService.removeAwareness(fileId, socketId);
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

  removeDocument(fileId: string) {
    this.documents.delete(fileId);
    this.logger.log(`Removed document for file: ${fileId}`);
  }
}
