import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import {
  ProjectDto,
  ProjectQueryDto,
  UpdateProjectDto,
} from './dto/project.dto';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { RESPONSE_MESSAGES } from 'src/common/utils/response-messages';
import { fail, success } from 'src/common/utils/response.util';
import { RealtimeEmitService } from '../realtime/core/realtime-emit.service';
import { PROJECT_EVENTS } from '../realtime/events/project.events';
import { InngestService } from 'src/common/inngest/inngest.service';
import { deriveDefaultName } from './project-name.util';
import type { Project } from 'src/common/database/schema/projects/project.schema';

@Injectable()
export class projectService {
  private readonly logger = new Logger(projectService.name);

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly realtimeEmitService: RealtimeEmitService,
    private readonly inngestService: InngestService,
  ) {}
  async findAll(req: AuthenticatedRequest, query: ProjectQueryDto) {
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
      project: project,
    });
  }
  async create(body: ProjectDto, req: AuthenticatedRequest) {
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    const explicitName = typeof body.name === 'string' ? body.name.trim() : '';

    const project = await this.projectRepository.create({
      userId: req.user.id,
      name: explicitName || deriveDefaultName(prompt),
    });

    this.realtimeEmitService.toUser(
      req.user.id.toString(),
      PROJECT_EVENTS.CREATED,
      project,
    );

    // Prompt-based creates get the final short name via Inngest; never blocks.
    // Explicit sidebar names are final as typed — no regeneration.
    if (!explicitName && prompt) {
      void this.inngestService
        .createProject({
          projectId: project.id.toString(),
          prompt,
        })
        .catch((err) => {
          this.logger.warn(
            `project/create enqueue failed for ${project.id}: ${err}`,
          );
        });
    }

    return success(RESPONSE_MESSAGES.PROJECT.CREATE.SUCCESS, {
      project: project,
    });
  }

  /** Called by the Inngest create-project function when the short name is ready. */
  async applyGeneratedName(
    projectId: string,
    name: string,
  ): Promise<Project | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const updated = await this.projectRepository.update(BigInt(projectId), {
      name: trimmed.slice(0, 100),
    });
    if (!updated) return null;

    this.realtimeEmitService.toUser(
      updated.userId.toString(),
      PROJECT_EVENTS.UPDATED,
      updated,
    );
    return updated;
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
    const updatedProject = await this.projectRepository.update(projectId, body);
    this.realtimeEmitService.toUser(
      req.user.id.toString(),
      PROJECT_EVENTS.UPDATED,
      updatedProject,
    );
    return success(RESPONSE_MESSAGES.PROJECT.UPDATE_SUCCESS, {
      project: updatedProject,
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
      project,
    );
    return success(RESPONSE_MESSAGES.PROJECT.DELETE_SUCCESS);
  }
}
