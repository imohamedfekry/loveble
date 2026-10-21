import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ProcessInfo } from 'e2b';
import { createHash } from 'node:crypto';

import { E2bService } from 'src/Modules/sandbox/e2b.service';
import { SandboxService } from 'src/Modules/sandbox/sandbox.service';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { DocumentStateService } from 'src/Modules/realtime/core/document-state.service';
import { ProjectPathResolver } from 'src/Modules/ai/workspace/project-path.resolver';
import type { File as ProjectFile } from 'src/common/database/schema/projects/file.schema';

import {
  PREVIEW_DEV_PORT,
  PREVIEW_INSTALL_TIMEOUT_MS,
  PREVIEW_PROJECT_ROOT,
  PREVIEW_READY_TTL_MS,
  PREVIEW_START_TIMEOUT_MS,
  previewBasePath,
} from './preview.constants';
import { buildScaffoldFiles } from './preview-scaffold';

export type PreviewStatus =
  'stopped' | 'installing' | 'starting' | 'ready' | 'error';

export interface PreviewState {
  status: PreviewStatus;
  /** Public URL path (served by our proxy) when the server is reachable. */
  url?: string;
  /** Sandbox public hostname (used by internal/AI callers). */
  host?: string;
  error?: string;
}

interface InternalState {
  sandboxId: string;
  basePath: string;
  status: PreviewStatus;
  signature?: string;
  packageHash?: string;
  installed: boolean;
  pid?: number;
  host?: string;
  error?: string;
  checkedAt: number;
}

const WRITE_BATCH_SIZE = 50;

@Injectable()
export class PreviewService {
  private readonly logger = new Logger(PreviewService.name);
  private readonly states = new Map<string, InternalState>();
  private readonly inflight = new Map<string, Promise<InternalState>>();

  constructor(
    private readonly e2bService: E2bService,
    private readonly sandboxService: SandboxService,
    private readonly projectRepository: ProjectRepository,
    private readonly fileRepository: FileRepository,
    private readonly documentState: DocumentStateService,
  ) {}

  /** Ensure the project's preview is materialized and running. */
  async ensure(projectId: bigint): Promise<PreviewState> {
    const key = projectId.toString();
    const current = this.states.get(key);

    if (
      current?.status === 'ready' &&
      current.host &&
      Date.now() - current.checkedAt < PREVIEW_READY_TTL_MS
    ) {
      return this.toPublic(current);
    }

    const running = this.inflight.get(key);
    if (running) return this.toPublic(await running);

    const promise = this.ensureInner(projectId, key).finally(() => {
      if (this.inflight.get(key) === promise) this.inflight.delete(key);
    });
    this.inflight.set(key, promise);

    return this.toPublic(await promise);
  }

  /** Read the cached state without triggering any provisioning. */
  peek(projectId: bigint): PreviewState | undefined {
    const state = this.states.get(projectId.toString());
    return state ? this.toPublic(state) : undefined;
  }

  private toPublic(state: InternalState): PreviewState {
    return {
      status: state.status,
      url: state.status === 'ready' ? state.basePath : undefined,
      host: state.host,
      error: state.error,
    };
  }

  private async ensureInner(
    projectId: bigint,
    key: string,
  ): Promise<InternalState> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const ensured = await this.sandboxService.ensure(project.sandboxId ?? null);
    if (ensured.created) {
      await this.projectRepository.updateSandboxId(
        projectId,
        ensured.sandboxId,
      );
    }
    const sandboxId = ensured.sandboxId;
    const basePath = previewBasePath(key);

    let state = this.states.get(key);
    if (
      !state ||
      state.sandboxId !== sandboxId ||
      state.basePath !== basePath
    ) {
      state = {
        sandboxId,
        basePath,
        status: 'stopped',
        installed: false,
        checkedAt: 0,
      };
      this.states.set(key, state);
    }

    try {
      const files =
        await this.fileRepository.getAllFilesWithProjectId(projectId);

      const signature = this.computeSignature(projectId, files);
      if (state.signature !== signature) {
        state.status = 'installing';
        const { entries, packageHash } = await this.buildEntries(
          projectId,
          files,
        );
        await this.materialize(sandboxId, entries);
        state.signature = signature;
        if (state.packageHash !== packageHash) {
          state.packageHash = packageHash;
          state.installed = false;
        }
      }

      if (!state.installed) {
        state.status = 'installing';
        await this.install(sandboxId);
        state.installed = true;
      }

      state.host = await this.e2bService.getHost(sandboxId, PREVIEW_DEV_PORT);
      state.status = 'starting';

      // Only trust a server we started in this process; after a restart the
      // sandbox may still hold an older dev server with a stale config.
      const alreadyUp = state.pid != null && (await this.isHealthy(state.host));
      if (!alreadyUp) {
        if (state.pid) {
          await this.e2bService
            .killProcess(sandboxId, state.pid)
            .catch(() => undefined);
          state.pid = undefined;
        }
        await this.killStaleServers(sandboxId);
        state.pid = await this.startDevServer(sandboxId, state.host);
        const ok = await this.waitForHealthy(state.host);
        if (!ok) {
          throw new Error(
            'Preview server did not become ready — check the project files',
          );
        }
      }

      state.status = 'ready';
      state.error = undefined;
      state.checkedAt = Date.now();
      this.logger.log(`Preview ready for project ${key} at ${state.host}`);
      return state;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      state.status = 'error';
      state.error = message;
      state.checkedAt = 0;
      this.logger.error(`Preview failed for project ${key}: ${message}`);
      throw err;
    }
  }

  // ---------------------------------------------------------------- files ---

  private computeSignature(projectId: bigint, files: ProjectFile[]): string {
    const resolver = new ProjectPathResolver(projectId, files);
    const paths = files
      .filter((file) => file.type === 'file')
      .map((file) => resolver.pathOfId(file.id.toString()))
      .filter((path): path is string => Boolean(path))
      .sort();
    const meta = files
      .map(
        (file) =>
          `${file.id}:${file.type}:${file.version}:${file.updatedAt.getTime()}`,
      )
      .sort();
    return createHash('sha256')
      .update(`${paths.join('|')}\n${meta.join('|')}`)
      .digest('hex');
  }

  private async buildEntries(
    projectId: bigint,
    files: ProjectFile[],
  ): Promise<{
    entries: Array<{ path: string; data: string }>;
    packageHash: string;
  }> {
    const resolver = new ProjectPathResolver(projectId, files);
    const providedPaths = new Set<string>();
    const listed: Array<{ rel: string; file: ProjectFile }> = [];

    for (const file of files) {
      if (file.type !== 'file') continue;
      const rel = resolver.pathOfId(file.id.toString());
      if (!rel) continue;
      if (rel.includes('..') || rel.startsWith('/')) continue;
      providedPaths.add(rel);
      listed.push({ rel, file });
    }

    const merged = new Map<string, string>();
    for (const scaffold of buildScaffoldFiles(providedPaths)) {
      merged.set(scaffold.path, scaffold.data);
    }

    for (const { rel, file } of listed) {
      try {
        const { doc } = await this.documentState.getDocument(
          file.id.toString(),
        );
        merged.set(rel, doc);
      } catch (err) {
        this.logger.warn(`could not read file ${rel}: ${String(err)}`);
      }
    }

    const entries = [...merged.entries()].map(([rel, data]) => ({
      path: `${PREVIEW_PROJECT_ROOT}/${rel}`,
      data,
    }));
    const packageHash = createHash('sha256')
      .update(merged.get('package.json') ?? '')
      .digest('hex');

    return { entries, packageHash };
  }

  private async materialize(
    sandboxId: string,
    entries: Array<{ path: string; data: string }>,
  ): Promise<void> {
    for (let i = 0; i < entries.length; i += WRITE_BATCH_SIZE) {
      const batch = entries.slice(i, i + WRITE_BATCH_SIZE);
      await this.e2bService.writeFiles(sandboxId, batch, {
        requestTimeoutMs: 120_000,
      });
    }
  }

  private async install(sandboxId: string): Promise<void> {
    this.logger.log(`Installing dependencies in ${PREVIEW_PROJECT_ROOT}...`);
    const result = await this.e2bService.runCommand(
      sandboxId,
      'npm install --no-audit --no-fund',
      { cwd: PREVIEW_PROJECT_ROOT, timeoutMs: PREVIEW_INSTALL_TIMEOUT_MS },
    );
    if (result.exitCode !== 0) {
      throw new Error(
        `npm install failed (exit ${result.exitCode}): ${result.stderr.slice(-2000)}`,
      );
    }
    this.logger.log('Dependencies installed');
  }

  private async startDevServer(
    sandboxId: string,
    host: string,
  ): Promise<number> {
    const command =
      `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=${host} ` +
      `npm run dev -- --host --port ${PREVIEW_DEV_PORT} --strictPort`;
    const { pid } = await this.e2bService.runBackground(sandboxId, command, {
      cwd: PREVIEW_PROJECT_ROOT,
    });
    this.logger.log(
      `Started dev server (pid ${pid}) on port ${PREVIEW_DEV_PORT}`,
    );
    return pid;
  }

  /** Kill any leftover dev server bound to the preview project directory. */
  private async killStaleServers(sandboxId: string): Promise<void> {
    let processes: ProcessInfo[];
    try {
      processes = await this.e2bService.listProcesses(sandboxId);
    } catch {
      return;
    }

    const ours = processes.filter(
      (process) =>
        process.cwd === PREVIEW_PROJECT_ROOT ||
        process.cmd.includes('vite') ||
        process.args?.some(
          (arg) => arg.includes(PREVIEW_PROJECT_ROOT) || arg.includes('vite'),
        ),
    );
    if (ours.length === 0) return;

    await Promise.all(
      ours.map((process) =>
        this.e2bService
          .killProcess(sandboxId, process.pid)
          .catch(() => undefined),
      ),
    );
    // Give the OS a moment to release the port before rebinding it.
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }

  // --------------------------------------------------------------- health ---

  private async isHealthy(host: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const res = await fetch(`https://${host}/`, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
      });
      // Anything below a gateway/server error means the dev server answered.
      return res.status < 500;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async waitForHealthy(host: string): Promise<boolean> {
    const deadline = Date.now() + PREVIEW_START_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (await this.isHealthy(host)) return true;
      await new Promise((resolve) => setTimeout(resolve, 1_500));
    }
    return false;
  }
}
