import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Workspace } from '@mastra/core/workspace';
import type { RequestContext } from '@mastra/core/request-context';

import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { plannerAgent } from 'src/mastra/agents/planner.agent';
import { builderAgent } from 'src/mastra/agents/builder.agent';
import { DocumentStateService } from '../../realtime/core/document-state.service';
import { ProjectPathResolver } from './project-path.resolver';
import { ProjectFilesystem, type ProjectMutations } from './project-filesystem';
import { ProjectMutationsService } from './project-mutations.service';

type WorkspaceMode = 'plan' | 'build';

@Injectable()
export class AgentWorkspacesService implements OnModuleInit {
  private readonly logger = new Logger(AgentWorkspacesService.name);
  /** One workspace instance per chat request, keyed by the RequestContext identity. */
  private readonly perRequest = new WeakMap<object, Workspace>();

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly documentState: DocumentStateService,
    private readonly projectMutations: ProjectMutationsService,
  ) {}

  onModuleInit(): void {
    plannerAgent.__setWorkspace(({ requestContext }) =>
      this.workspaceFor(requestContext, 'plan'),
    );
    builderAgent.__setWorkspace(({ requestContext }) =>
      this.workspaceFor(requestContext, 'build'),
    );
  }

  private async workspaceFor(
    requestContext: RequestContext | undefined,
    mode: WorkspaceMode,
  ): Promise<Workspace | undefined> {
    if (!requestContext) return undefined;
    const rawProjectId = requestContext.get('projectId');
    if (typeof rawProjectId !== 'string' && typeof rawProjectId !== 'number') {
      return undefined;
    }
    const projectId = String(rawProjectId);

    const cacheKey: object = requestContext;
    const cached = this.perRequest.get(cacheKey);
    if (cached) return cached;

    const projectIdBig = BigInt(projectId);
    const files =
      await this.fileRepository.getAllFilesWithProjectId(projectIdBig);
    const reload = async () =>
      new ProjectPathResolver(
        projectIdBig,
        await this.fileRepository.getAllFilesWithProjectId(projectIdBig),
      );

    const filesystem = new ProjectFilesystem({
      id: `project-${projectId}-${mode}`,
      resolver: new ProjectPathResolver(projectIdBig, files),
      documentState: this.documentState,
      readOnly: mode !== 'build',
      mutations: mode === 'build' ? this.mutationsFor(projectIdBig) : undefined,
      reload,
    });

    const workspace = new Workspace({
      id: `project-${projectId}-${mode}`,
      name: 'Project Workspace',
      filesystem,
    });

    this.perRequest.set(cacheKey, workspace);
    this.logger.debug(
      `built ${mode} workspace for project ${projectId} (${files.length} nodes, readOnly=${filesystem.readOnly})`,
    );
    return workspace;
  }

  private mutationsFor(projectId: bigint): ProjectMutations {
    return {
      writeFile: (path, content) =>
        this.projectMutations.writeFile(projectId, path, content),
      mkdir: (path) => this.projectMutations.mkdir(projectId, path),
      deleteFile: (path) => this.projectMutations.deleteFile(projectId, path),
    };
  }
}
