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
    let currentPath = '';
    let resolver = await this.loadResolver(projectId);
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const found = resolver.resolve(currentPath);
      if (found) {
        if (found.type !== 'folder') {
          throw new BadRequestException(
            `Path component exists and is not a folder: ${currentPath}`,
          );
        }
        parentId = BigInt(found.id);
        continue;
      }
      const created = await this.fileRepository.createFile({
        projectId,
        parentId,
        name: segment,
        type: 'folder',
      });
      this.emitFileEvent(projectId, FILE_EVENTS.CREATED, created);
      parentId = created.id;
      resolver = await this.loadResolver(projectId);
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

    let resolver = await this.loadResolver(projectId);
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
    let currentPath = '';
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const found = resolver.resolve(currentPath);
      if (found) {
        if (found.type !== 'folder') {
          throw new BadRequestException(
            `Path component exists and is not a folder: ${currentPath}`,
          );
        }
        parentId = BigInt(found.id);
        continue;
      }
      const created = await this.fileRepository.createFile({
        projectId,
        parentId,
        name: segment,
        type: 'folder',
      });
      this.emitFileEvent(projectId, FILE_EVENTS.CREATED, created);
      parentId = created.id;
      resolver = await this.loadResolver(projectId);
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
