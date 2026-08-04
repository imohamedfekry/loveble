import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import { RESPONSE_MESSAGES } from 'src/common/utils/response-messages';
import { fail, success } from 'src/common/utils/response.util';
import { RealtimeEmitService } from '../realtime/core/realtime-emit.service';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { CreateFileDto, UpdateFileContentDto, UpdateFileDto } from './dto/file.dto';
import { FILE_EVENTES } from '../realtime/events/files.events';
import * as v from "valibot";
import { FileStandard } from './dto/file.dto';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';
@Injectable()
export class FileService {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly realtimeEmitService: RealtimeEmitService,
    private readonly storageService: StorageService,
    // private readonly S3client: S3Client,
    private readonly config: ConfigService,
  ) { }
  async getRootFiles(projectId: bigint, req: AuthenticatedRequest) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }
    const files = await this.fileRepository.getProjectRootFiles(projectId);
    return success(RESPONSE_MESSAGES.PROJECT.FETCH_SUCCESS, {
      files: v.parse(v.array(FileStandard), files),
    });
  }
  async findByProjectId(projectId: bigint, req: AuthenticatedRequest) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }
    const files = await this.fileRepository.getAllFilesWithProjectId(projectId);

    return success(RESPONSE_MESSAGES.PROJECT.FETCH_SUCCESS, {
      files: v.parse(v.array(FileStandard), files),
    });
  }
  async getFileContent(projectId: bigint, fileId: bigint, req: AuthenticatedRequest) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }
    const file = await this.fileRepository.getFile(fileId);
    if (!file || file.projectId !== projectId) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.FILE.NOT_FOUND));
    }
    const storageKey = file.storageKey;
    const content = await this.storageService.getFileContent(storageKey);
    return success(RESPONSE_MESSAGES.FILE.FETCH_SUCCESS, {
      file: {
        content: content,
      },
    });
  }

  async findFolderContent(projectId: bigint, folderId: bigint, req: AuthenticatedRequest) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }
    const data = await this.fileRepository.getFolderContents(projectId, folderId);
    const file = await this.fileRepository.getFile(folderId);
    if (!file) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.FILE.NOT_FOUND));
    }
    if (file.type !== 'folder' || file.projectId !== projectId || file.id !== folderId) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.FILE.NOT_FOUND));
    }
    if (!data) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.FILE.NOT_FOUND),);
    }
    return success(RESPONSE_MESSAGES.PROJECT.FETCH_SUCCESS, {
      files: data,
    });
  }
  async createFile(body: CreateFileDto, projectId: bigint, req: AuthenticatedRequest) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }
    let created;
    try {
      created = await this.fileRepository.createFile({
        ...body,
        projectId,
      });
    } catch (error: any) {
      if (
        error?.cause?.code === '23505' &&
        error?.cause?.constraint === 'files_unique_name_per_folder_idx'
      ) {
        throw new ConflictException(fail(RESPONSE_MESSAGES.FILE.DUPLICATE_NAME));
      }
      throw error;
    }
    console.log("created file", created);
    this.realtimeEmitService.toProject(
      projectId.toString(),
      FILE_EVENTES.CREATED,
      created
    );
    return success(RESPONSE_MESSAGES.FILE.CREATED, { file: created });
  }
  async updateFile(
    body: UpdateFileDto,
    projectId: bigint,
    fileId: bigint,
    req: AuthenticatedRequest
  ) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }
    let updatedFile;
    try {
      updatedFile = await this.fileRepository.updateFile(fileId, projectId, {
        ...body,
        ...(body.parentId !== undefined && {
          parentId: body.parentId,
        }),
      });
    } catch (error: any) {
      if (
        error?.cause?.code === '23505' &&
        error?.cause?.constraint === 'files_unique_name_per_folder_idx'
      ) {
        throw new ConflictException(fail(RESPONSE_MESSAGES.FILE.DUPLICATE_NAME));
      }
      throw error;
    }

    if (!updatedFile) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.FILE.NOT_FOUND));
    }

    this.realtimeEmitService.toProject(
      projectId.toString(),
      FILE_EVENTES.UPDATED,
      updatedFile,
    );
    return success(RESPONSE_MESSAGES.FILE.UPDATED, { file: updatedFile });
  }
  async updateFileContent(
    projectId: bigint,
    fileId: bigint,
    req: AuthenticatedRequest,
    body: UpdateFileContentDto,
  ) {
    const project = await this.projectRepository.findById(projectId);

    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(
        fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND),
      );
    }

    const file = await this.fileRepository.getFile(fileId);

    if (!file || file.projectId !== projectId) {
      throw new NotFoundException(
        fail(RESPONSE_MESSAGES.FILE.NOT_FOUND),
      );
    }

    if (file.type !== "file") {
      throw new NotFoundException(
        fail(RESPONSE_MESSAGES.FILE.NOT_FOUND),
      );
    }

    await this.storageService.updateFileContent(
      file.storageKey,
      body.content,
    );

    this.realtimeEmitService.toProject(
      projectId.toString(),
      FILE_EVENTES.CONTENT_UPDATED,
      {
        fileId: file.id,
      },
    );

    return success(RESPONSE_MESSAGES.FILE.UPDATED);
  }
  async deleteFile(
    projectId: bigint,
    fileId: bigint,
    req: AuthenticatedRequest,
  ) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }
    const deletedFile = await this.fileRepository.deleteFile(fileId, projectId);
    if (!deletedFile) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.FILE.NOT_FOUND));
    }
    await this.storageService.delete(deletedFile.storageKey);
    this.realtimeEmitService.toProject(
      projectId.toString(),
      FILE_EVENTES.DELETED,
      deletedFile,
    );

    return success(RESPONSE_MESSAGES.FILE.DLETED, { file: deletedFile });
  }
}
