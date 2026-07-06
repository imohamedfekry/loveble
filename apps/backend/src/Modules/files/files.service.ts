import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import { RESPONSE_MESSAGES } from 'src/common/utils/response-messages';
import { fail, success } from 'src/common/utils/response.util';
import { RealtimeEmitService } from '../realtime/core/realtime-emit.service';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { CreateFileDto, UpdateFileDto } from './dto/file.dto';
import { DefaultGeneratedFile } from 'ai';

@Injectable()
export class FileService {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly realtimeEmitService: RealtimeEmitService,
  ) { }
  async findByProjectId(projectId: bigint, req: AuthenticatedRequest) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }
    const files = await this.fileRepository.getAllFilesWithProjectId(projectId);

    return success(RESPONSE_MESSAGES.PROJECT.FETCH_SUCCESS, {
      // project: project,
      files: files,
    });
  }
  async findFolderContent(projectId: bigint, folderId: bigint, req: AuthenticatedRequest) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }
    const data = await this.fileRepository.getFolderContents(projectId, folderId)
    // check if folder id type is folder and check is same project
    const file = await this.fileRepository.getFile(folderId)
    if (!file) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.FILE.NOT_FOUND),);
    }
    if (file?.type !== "folder" || file.projectId !== folderId) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.FILE.NOT_FOUND),);
    }
    if (!data) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.FILE.NOT_FOUND),);
    }
    return success(RESPONSE_MESSAGES.PROJECT.FETCH_SUCCESS, {
      project: project,
      files: data,
    });
  }
  async createFile(body: CreateFileDto, projectId: bigint, req: AuthenticatedRequest) {

    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }
    let created
    try {
      created = await this.fileRepository.createFile({
        ...body,
        projectId
      })
    } catch (error: any) {
      if (error.cause.code === '23505' && error.cause.constraint === 'files_unique_name_per_folder_idx') {
        throw new ConflictException(
          fail(RESPONSE_MESSAGES.FILE.DUPLICATE_NAME),
        );
      }
    }

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
    const updatedFile = await this.fileRepository.updateFile(fileId, projectId, {
      ...body,
      parentId: body.parentId ?? null,
    });
    if (!updatedFile) {
      throw new NotFoundException(
        fail(RESPONSE_MESSAGES.FILE.NOT_FOUND),
      );
    }
    return success(RESPONSE_MESSAGES.FILE.UPDATED, { file: updatedFile });
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
    const deletedFile = this.fileRepository.deleteFile(fileId, projectId)
    if (!deletedFile) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.FILE.NOT_FOUND));
    }

    return success(RESPONSE_MESSAGES.FILE.DLETED, { file: deletedFile });
  }
}
