import { Injectable, NotFoundException } from '@nestjs/common';
import { streamText } from 'ai';
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
import { getModel } from 'src/ai/providers';
import type { ModelId } from 'src/ai/providers/types';
import { inngest } from 'src/common/inngest/client';
import { words } from 'valibot';

@Injectable()
export class projectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly realtimeEmitService: RealtimeEmitService,
  ) { }
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
     const words = body.prompt.split(/\s+/).slice(0, 5).join(' ');
    const defaultName = words.length > 3 ? words + '...' : words;
    const project = await this.projectRepository.create({
      userId: req.user.id,
      name: defaultName,
    });
    this.generateAndUpdateName(project.id, body.prompt);

    this.realtimeEmitService.toUser(
      req.user.id.toString(),
      PROJECT_EVENTS.CREATED,
      project,
    );

    return success(RESPONSE_MESSAGES.PROJECT.CREATE.SUCCESS, {
      project: project,
    });
  }

  private async generateAndUpdateName(projectId: bigint, prompt: string): Promise<void> {
    const modelId: ModelId = 'google:gemini-2.5-flash';
    const model = getModel(modelId);
    try {
      const result = await streamText({
        model,
        prompt: `Based on this description, give a short creative project name (max 50 characters). Use words from the description. Return only the name, nothing else: "${prompt}"`,
      });
      let projectName = '';
      for await (const chunk of result.textStream) {
        projectName += chunk;
      }
      projectName = projectName.trim();
      if (projectName) {
        await this.projectRepository.update(projectId, { name: projectName });
        const updated = await this.projectRepository.findById(projectId);
        if (updated && updated.userId) {
          this.realtimeEmitService.toUser(
            updated.userId.toString(),
            PROJECT_EVENTS.UPDATED,
            updated,
          );
        }
      }
    } catch (err) {
      console.error('Failed to generate project name:', err);
    }
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
