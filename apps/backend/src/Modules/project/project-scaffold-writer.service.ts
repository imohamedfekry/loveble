import { Injectable, Logger } from '@nestjs/common';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { StorageService } from 'src/Modules/storage/storage.service';
import { RealtimeEmitService } from 'src/Modules/realtime/core/realtime-emit.service';
import { FILE_EVENTS } from '../realtime/events/files.events';
import type { Project } from 'src/common/database/schema/projects/project.schema';
import { collectFolderPaths, normalizePath } from './scaffold/scaffold.parser';
import type { ScaffoldFile } from './scaffold/scaffold.types';

@Injectable()
export class ProjectScaffoldWriter {
  private readonly logger = new Logger(ProjectScaffoldWriter.name);

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly storageService: StorageService,
    private readonly realtimeEmitService: RealtimeEmitService,
  ) {}

  /** Create every folder needed once (de-duplicated), then create each file,
   *  write its content to S3, and emit file:created in order. */
  async writeFiles(project: Project, files: ScaffoldFile[]): Promise<void> {
    if (!files.length) return;

    const parentByPath = await this.ensureFolderTree(project.id, files);

    for (const file of files) {
      await this.writeFile(project.id, parentByPath, file);
    }

    this.logger.log(
      `Wrote ${files.length} scaffold file(s) to project ${project.id}`,
    );
  }

  // ── folder tree (one lookup per unique path) ────────────────────────

  private async ensureFolderTree(
    projectId: bigint,
    files: ScaffoldFile[],
  ): Promise<Map<string, bigint | null>> {
    const parentByPath = new Map<string, bigint | null>();
    parentByPath.set('', null);

    for (const segments of collectFolderPaths(files)) {
      const parentKey = segments.slice(0, -1).join('/');
      const parentId = parentByPath.get(parentKey) ?? null;
      const name = segments[segments.length - 1];
      const pathKey = segments.join('/');

      const existing = await this.fileRepository.findFolderByName(
        projectId,
        parentId,
        name,
      );
      const folder =
        existing ?? (await this.createFolder(projectId, parentId, name));

      parentByPath.set(pathKey, folder.id);
    }

    return parentByPath;
  }

  private async createFolder(
    projectId: bigint,
    parentId: bigint | null,
    name: string,
  ) {
    try {
      const folder = await this.fileRepository.createFile({
        projectId,
        parentId,
        name,
        type: 'folder',
        storageKey: null,
      });
      this.realtimeEmitService.toProject(
        projectId.toString(),
        FILE_EVENTS.CREATED,
        folder,
      );
      return folder;
    } catch (err) {
      const duplicate = await this.fileRepository.findFolderByName(
        projectId,
        parentId,
        name,
      );
      if (duplicate) {
        this.logger.debug(
          `Reused folder '${name}' after concurrent create on project ${projectId}`,
        );
        return duplicate;
      }
      throw err;
    }
  }

  // ── single file write + emit ────────────────────────────────────────

  private async writeFile(
    projectId: bigint,
    parentByPath: Map<string, bigint | null>,
    file: ScaffoldFile,
  ) {
    const segments = normalizePath(file.path).split('/').filter(Boolean);
    const name = segments.pop();
    if (!name) return;

    const parentId = parentByPath.get(segments.join('/')) ?? null;
    const created = await this.fileRepository.createFile({
      projectId,
      parentId,
      name,
      type: 'file',
      storageKey: undefined,
    });

    if (created.storageKey) {
      await this.storageService.updateFileContent(
        created.storageKey,
        file.content,
      );
    }

    this.realtimeEmitService.toProject(
      projectId.toString(),
      FILE_EVENTS.CREATED,
      created,
    );
  }
}
