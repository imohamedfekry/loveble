import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { FileExistsError, Workspace } from '@mastra/core/workspace';
import type { WorkspaceToolsConfig } from '@mastra/core/workspace';
import type { RequestContext } from '@mastra/core/request-context';

import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { plannerAgent } from 'src/mastra/agents/planner.agent';
import { builderAgent } from 'src/mastra/agents/builder.agent';
import { quickEditAgent } from 'src/mastra/agents/quick-edit.agent';
import { DocumentStateService } from '../../realtime/core/document-state.service';
import { ProjectPathResolver } from './project-path.resolver';
import { ProjectFilesystem, type ProjectMutations } from './project-filesystem';
import { ProjectMutationsService } from './project-mutations.service';

type WorkspaceMode = 'plan' | 'build';

/** Minimal filesystem surface the write hook needs (avoids importing the full type). */
type HookFilesystem = {
  exists(path: string): Promise<boolean>;
  writeFile(path: string, content: string): Promise<void>;
};

/**
 * `write_file` normally reports `Wrote N bytes to <path>`. The chat UI reads the
 * tool output to decide whether a row is a "Create file" or an "Update file", so we
 * run the write here instead and hand back a human-readable line.
 * Running under Mastra's per-path write lock, so this stays serialized.
 */
const BUILD_MODE_TOOLS: WorkspaceToolsConfig = {
  hooks: {
    beforeToolCall: async ({ workspaceToolName, input, context }) => {
      if (workspaceToolName !== 'mastra_workspace_write_file') return undefined;

      const args = input as {
        path?: unknown;
        content?: unknown;
        overwrite?: unknown;
      } | null;
      const path = typeof args?.path === 'string' ? args.path : '';
      const content = typeof args?.content === 'string' ? args.content : '';
      if (!path) return undefined;

      const fs = (
        context as { workspace?: { filesystem?: HookFilesystem } } | undefined
      )?.workspace?.filesystem;
      if (!fs) return undefined;

      const existed = await fs.exists(path);
      if (existed && args?.overwrite === false) throw new FileExistsError(path);
      await fs.writeFile(path, content);

      const bytes = Buffer.byteLength(content, 'utf-8');
      return {
        proceed: false as const,
        output: `${existed ? 'Updated' : 'Created'} ${path} (${bytes} bytes)`,
      };
    },
  },
};

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
    quickEditAgent.__setWorkspace(({ requestContext }) =>
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
      tools: mode === 'build' ? BUILD_MODE_TOOLS : undefined,
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
      deletePath: (path, recursive) =>
        this.projectMutations.deletePath(projectId, path, recursive),
    };
  }
}
