import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ChangeSet, Text } from '@codemirror/state';
import * as v from 'valibot';

import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { FileStandard } from 'src/Modules/files/dto/file.dto';
import {
  FILE_EVENTS,
  COLLAB_EVENTS,
} from 'src/Modules/realtime/events/files.events';
import { DocumentStateService } from 'src/Modules/realtime/core/document-state.service';
import { RealtimeEmitService } from 'src/Modules/realtime/core/realtime-emit.service';
import { ProjectPathResolver } from './project-path.resolver';

const AGENT_CLIENT_ID = 'loveble-agent';

/**
 * Applies agent filesystem mutations to a project.
 *
 * New paths create the missing folder chain + file rows (and broadcast
 * `file:created`), then content is written through the collaboration pipeline
 * (`DocumentStateService.pushUpdates` + `file:collab:update`) so open editors
 * stay in sync and persistence runs through the normal debounced Inngest flow.
 */
@Injectable()
export class ProjectMutationsService {
  private readonly logger = new Logger(ProjectMutationsService.name);

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly documentState: DocumentStateService,
    private readonly realtimeEmit: RealtimeEmitService,
  ) {}

  /** Create or overwrite a file at `path` (creating folders on the way). */
  async writeFile(projectId: bigint, path: string, content: string) {
    const file = await this.ensureFileNode(projectId, path);
    await this.replaceDocument(file.id.toString(), content);
  }

  async mkdir(projectId: bigint, path: string) {
    const normalized = ProjectPathResolver.normalize(path);
    if (!normalized) {
      throw new BadRequestException('Cannot create project root');
    }
    const segments = normalized.split('/');
    let parentId: bigint | null = null;
    for (const segment of segments) {
      parentId = await this.ensureFolder(projectId, parentId, segment);
    }
  }

  /**
   * Find-or-create a folder `name` under `parentId`. Looked up by name from the
   * DB (not a cached snapshot) and tolerant of a concurrent create that wins the
   * unique `(projectId, parentId, name)` index, so a stale in-memory resolver can
   * never turn into a duplicate-key failure mid-turn.
   */
  private async ensureFolder(
    projectId: bigint,
    parentId: bigint | null,
    name: string,
  ): Promise<bigint> {
    const existing = await this.fileRepository.findFolderByName(
      projectId,
      parentId,
      name,
    );
    if (existing) {
      if (existing.type !== 'folder') {
        throw new BadRequestException(
          `Path component exists and is not a folder: ${name}`,
        );
      }
      return BigInt(existing.id);
    }
    try {
      const created = await this.fileRepository.createFile({
        projectId,
        parentId,
        name,
        type: 'folder',
      });
      this.emitFileEvent(projectId, FILE_EVENTS.CREATED, created);
      return created.id;
    } catch (err) {
      // Unique index hit by a concurrent create — reuse the winner.
      const winner = await this.fileRepository.findFolderByName(
        projectId,
        parentId,
        name,
      );
      if (winner) return BigInt(winner.id);
      throw err;
    }
  }

  async deleteFile(projectId: bigint, path: string) {
    const resolver = await this.loadResolver(projectId);
    const node = resolver.resolve(path);
    if (!node) {
      throw new BadRequestException(`File not found: ${path}`);
    }
    const deleted = await this.fileRepository.deleteFile(
      BigInt(node.id),
      projectId,
    );
    if (!deleted) return;
    this.emitFileEvent(projectId, FILE_EVENTS.DELETED, deleted);
    try {
      await this.documentState.unload(node.id);
    } catch (err) {
      this.logger.warn(
        `deleteFile unload failed file=${node.id}: ${String(err)}`,
      );
    }
  }

  /**
   * Delete a node (file or folder) at `path`. Folders delete recursively —
   * every descendant file row, folder row and document-state entry is removed,
   * and `file:deleted` events are broadcast so the workspace UI stays in sync.
   * The agent's `mastra_workspace_delete` tool targets folders like `src/`
   * when it wants to scaffold a project from scratch, so this is the path the
   * old "rmdir is not supported" error surfaced on.
   */
  async deletePath(projectId: bigint, path: string, recursive = true) {
    const resolver = await this.loadResolver(projectId);
    const node = resolver.resolve(path);
    if (!node) {
      // Deleting a missing path is a no-op for the tool boundary (mirrors the
      // POSIX `rm -rf` contract) so the agent can clean up unguarded paths.
      return;
    }

    const pending: { node: typeof node; depth: number }[] = [
      { node, depth: 0 },
    ];
    const toDelete: { node: typeof node; depth: number }[] = [];

    // Walk the full subtree so we unload all documents BEFORE the DB rows
    // disappear (documentState is keyed by file id and has no project scope).
    while (pending.length > 0) {
      const current = pending.pop()!;
      toDelete.push(current);
      if (current.node.type !== 'folder') continue;
      if (!recursive && current.depth > 0) {
        throw new BadRequestException(`Directory not empty: ${path}`);
      }
      const children = resolver.childrenOf(current.node.id);
      for (const child of children) {
        pending.push({ node: child, depth: current.depth + 1 });
      }
    }

    // Delete deepest first so parent folders are removed after their children.
    toDelete.sort((a, b) => b.depth - a.depth);
    for (const { node } of toDelete) {
      let deleted: unknown = null;
      try {
        deleted = await this.fileRepository.deleteFile(
          BigInt(node.id),
          projectId,
        );
      } catch (err) {
        this.logger.warn(
          `deletePath failed node=${node.id} path=${path}: ${String(err)}`,
        );
      }
      if (deleted) this.emitFileEvent(projectId, FILE_EVENTS.DELETED, deleted);
      if (node.type === 'file') {
        try {
          await this.documentState.unload(node.id);
        } catch (err) {
          this.logger.warn(
            `deletePath unload failed file=${node.id}: ${String(err)}`,
          );
        }
      }
    }
  }

  private async loadResolver(projectId: bigint) {
    const files = await this.fileRepository.getAllFilesWithProjectId(projectId);
    return new ProjectPathResolver(projectId, files);
  }

  private async ensureFileNode(projectId: bigint, path: string) {
    const normalized = ProjectPathResolver.normalize(path);
    if (!normalized) {
      throw new BadRequestException('Cannot write to project root');
    }
    const segments = normalized.split('/');
    const fileName = segments.pop()!;

    const resolver = await this.loadResolver(projectId);
    const existing = resolver.resolve(normalized);
    if (existing) {
      if (existing.type === 'folder') {
        throw new BadRequestException(`Path is a folder: ${path}`);
      }
      const file = await this.fileRepository.getFile(BigInt(existing.id));
      if (!file) throw new BadRequestException(`File not found: ${path}`);
      return file;
    }

    let parentId: bigint | null = null;
    for (const segment of segments) {
      parentId = await this.ensureFolder(projectId, parentId, segment);
    }

    const createdFile = await this.fileRepository.createFile({
      projectId,
      parentId,
      name: fileName,
      type: 'file',
    });
    this.emitFileEvent(projectId, FILE_EVENTS.CREATED, createdFile);
    return createdFile;
  }

  /** Replace the whole document through the collab pipeline. */
  private async replaceDocument(fileId: string, content: string) {
    const { doc, version } = await this.documentState.getDocument(fileId);
    const textDoc = Text.of(doc.split('\n'));
    const changeSet = ChangeSet.of(
      [{ from: 0, to: textDoc.length, insert: content }],
      textDoc.length,
    );
    const update = {
      clientID: AGENT_CLIENT_ID,
      changes: changeSet.toJSON() as unknown,
    };

    const result = await this.documentState.pushUpdates(fileId, version, [
      update,
    ]);
    if (result.accepted) {
      this.broadcastCollabUpdate(fileId, [update], version, result.version);
      return;
    }

    // Version conflict (e.g. an editor wrote concurrently) — retry once
    // against the fresh doc.
    const fresh = await this.documentState.getDocument(fileId);
    const freshDoc = Text.of(fresh.doc.split('\n'));
    const retryChangeSet = ChangeSet.of(
      [{ from: 0, to: freshDoc.length, insert: content }],
      freshDoc.length,
    );
    const retryUpdate = {
      clientID: AGENT_CLIENT_ID,
      changes: retryChangeSet.toJSON() as unknown,
    };
    const retry = await this.documentState.pushUpdates(fileId, fresh.version, [
      retryUpdate,
    ]);
    if (!retry.accepted) {
      throw new BadRequestException(
        retry.error ?? 'Failed to apply file update',
      );
    }
    this.broadcastCollabUpdate(
      fileId,
      [retryUpdate],
      fresh.version,
      retry.version,
    );
  }

  private broadcastCollabUpdate(
    fileId: string,
    updates: { clientID: string; changes: unknown }[],
    fromVersion: number,
    version: number,
  ) {
    this.realtimeEmit.toFile(fileId, COLLAB_EVENTS.UPDATE, {
      fileId,
      updates,
      fromVersion,
      version,
    });
  }

  private emitFileEvent(projectId: bigint, event: string, file: unknown) {
    try {
      this.realtimeEmit.toProject(
        projectId.toString(),
        event,
        v.parse(FileStandard, file),
      );
    } catch (err) {
      this.logger.warn(
        `emitFileEvent(${event}) failed for file: ${String(err)}`,
      );
    }
  }
}
