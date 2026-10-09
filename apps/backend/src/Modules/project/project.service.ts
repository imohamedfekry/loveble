import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import type {
  GeneratedNameWebhookDto,
  ProjectDto,
  ProjectQueryDto,
  UpdateProjectDto,
} from './dto/project.dto';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { RESPONSE_MESSAGES } from '@loveble/utils';
import { fail, success } from 'src/common/utils/response.util';
import { RealtimeEmitService } from '../realtime/core/realtime-emit.service';
import { PROJECT_EVENTS } from '../realtime/events/project.events';
import { InngestService } from 'src/common/inngest/inngest.service';
import { deriveDefaultName } from './project-name.util';
import type { Project } from 'src/common/database/schema/projects/project.schema';
import { SandboxService } from 'src/Modules/sandbox/sandbox.service';
import { ConversationsService } from 'src/Modules/conversations/conversations.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class projectService {
  private readonly logger = new Logger(projectService.name);

  /** Dedupe concurrent /open calls for the same project (single instance). */
  private readonly openInflight = new Map<
    string,
    Promise<{
      sandboxId: string;
      status: 'running' | 'paused';
      created: boolean;
    }>
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly projectRepository: ProjectRepository,
    private readonly realtimeEmitService: RealtimeEmitService,
    private readonly inngestService: InngestService,
    private readonly sandboxService: SandboxService,
    private readonly conversationsService: ConversationsService,
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

    if (!explicitName && prompt) {
      try {
        await this.conversationsService.createWithInitialMessage(
          project.id,
          prompt,
        );
      } catch (err) {
        this.logger.warn(
          `initial conversation create failed for ${project.id}: ${String(err)}`,
        );
      }
    }

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

  async applyGeneratedName(
    body: GeneratedNameWebhookDto,
  ): Promise<Project | null> {
    const updated = await this.projectRepository.update(
      BigInt(body.projectId),
      { name: body.name },
    );
    if (!updated) return null;

    this.realtimeEmitService.toUser(
      updated.userId.toString(),
      PROJECT_EVENTS.UPDATED,
      updated,
    );

    return updated;
  }

  async openProject(projectId: bigint, req: AuthenticatedRequest) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }

    const key = projectId.toString();

    const run = async () => {
      const existingSandboxId =
        await this.projectRepository.findSandboxId(projectId);

      if (existingSandboxId) {
        this.logger.log(
          `Open project ${key}: checking stored sandbox ${existingSandboxId}`,
        );
      } else {
        this.logger.log(`Open project ${key}: no stored sandbox`);
      }

      const result = await this.sandboxService.ensure(existingSandboxId);

      if (result.created) {
        await this.projectRepository.updateSandboxId(
          projectId,
          result.sandboxId,
        );

        this.realtimeEmitService.toProject(
          projectId,
          PROJECT_EVENTS.SANDBOX_READY,
          { sandboxId: result.sandboxId },
        );
      }

      return result;
    };

    const inflight = this.openInflight.get(key) ?? run();
    this.openInflight.set(key, inflight);

    try {
      const { sandboxId, status, created } = await inflight;

      this.logger.log(
        `Open project ${key}: sandbox ${sandboxId} ready ` +
          `(${created ? 'created new' : 'reused existing'}, state: ${status})`,
      );

      return success(RESPONSE_MESSAGES.PROJECT.FETCH_SUCCESS, {
        sandboxId,
        status,
        created,
      });
    } catch (err) {
      this.logger.error(
        `Open project ${key}: sandbox ensure failed — ${String(err)}`,
      );

      if (err instanceof HttpException) {
        throw err;
      }

      throw new ServiceUnavailableException(
        fail({
          code: 'SANDBOX_UNAVAILABLE',
          message: 'Failed to start the environment. Please retry.',
        }),
      );
    } finally {
      if (this.openInflight.get(key) === inflight) {
        this.openInflight.delete(key);
      }
    }
  }
}
