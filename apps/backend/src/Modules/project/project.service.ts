import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import { ProjectDto, ProjectQueryDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { RESPONSE_MESSAGES } from 'src/common/utils/response-messages';
import { fail, success } from 'src/common/utils/response.util';
import { RealtimeEmitService } from '../realtime/core/realtime-emit.service';
import { PROJECT_EVENTS } from '../realtime/events/project.events';
import { serializeBigInt } from 'src/common/utils/snowflake';

@Injectable()
export class projectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly realtimeEmitService: RealtimeEmitService,
  ) { }
  async findAll(req: AuthenticatedRequest,query: ProjectQueryDto, ) {
    if (query.recent === 'true') {
      const projects = await this.projectRepository.findRecentByUserId(
        req.user.id,
      );
      return success(RESPONSE_MESSAGES.PROJECT.FETCH_SUCCESS, {
        projects,
      });
    }
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const result = await this.projectRepository.findByUserIdPaginated(
      req.user.id,
      page,
      limit,
    );

    return success(RESPONSE_MESSAGES.PROJECT.FETCH_SUCCESS, result);
  }
  async findById(projectId: bigint, req: AuthenticatedRequest) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }
    return success(RESPONSE_MESSAGES.PROJECT.FETCH_SUCCESS, {
      project: serializeBigInt(project),
    });
  }
  async create(body: ProjectDto, req: AuthenticatedRequest) {
    const project = await this.projectRepository.create({
      userId: req.user.id,
      name: body.name,
    });
    this.realtimeEmitService.toUser(
      req.user.id.toString(),
      PROJECT_EVENTS.CREATED,
      serializeBigInt(project),
    );
    return success(RESPONSE_MESSAGES.PROJECT.CREATE.SUCCESS, {
      project: serializeBigInt(project),
    });
  }
  async update(
    projectId: bigint,
    body: UpdateProjectDto,
    req: AuthenticatedRequest,
  ) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }
    const updatedProject = await this.projectRepository.update(
      projectId,
      body,
    );
    this.realtimeEmitService.toUser(
      req.user.id.toString(),
      PROJECT_EVENTS.UPDATED,
      serializeBigInt(updatedProject),
    );
    return success(RESPONSE_MESSAGES.PROJECT.UPDATE_SUCCESS, {
      project: serializeBigInt(updatedProject),
    });
  }
  async delete(projectId: bigint, req: AuthenticatedRequest) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }
    await this.projectRepository.delete(projectId);
    this.realtimeEmitService.toUser(
      req.user.id.toString(),
      PROJECT_EVENTS.DELETED,
      serializeBigInt(project),
    );
    return success(RESPONSE_MESSAGES.PROJECT.DELETE_SUCCESS);
  }
}
