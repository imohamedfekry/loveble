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

import { parseLovableConfig, resolvePreviewCommands } from './lovable-conf';
import {
  PREVIEW_DEV_PORT,
  PREVIEW_INSTALL_MARKER,
  PREVIEW_INSTALL_TIMEOUT_MS,
  PREVIEW_LOG_PATH,
  PREVIEW_PROJECT_ROOT,
  PREVIEW_READY_TTL_MS,
  PREVIEW_START_TIMEOUT_MS,
  PREVIEW_STATE_DIR,
  PREVIEW_SYNC_MARKER,
  previewPublicUrl,
} from './preview.constants';

export type PreviewStatus =
  'stopped' | 'installing' | 'starting' | 'ready' | 'error';

export interface PreviewState {
  status: PreviewStatus;
  /** Public subdomain URL (served by our proxy) when the server is reachable. */
  url?: string;
  /** Sandbox public hostname (used by internal/AI callers). */
  host?: string;
  error?: string;
}

interface InternalState {
  sandboxId: string;
  publicUrl: string;
  status: PreviewStatus;
  signature?: string;
  packageHash?: string;
  packageJson?: string;
  lovableConf?: string;
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
  async ensure(
    projectId: bigint,
    options?: { force?: boolean },
  ): Promise<PreviewState> {
    const key = projectId.toString();
    const current = this.states.get(key);

    if (
      !options?.force &&
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

  /** Tail of the dev server log (used by the AI to debug failed previews). */
  async readLogs(
    projectId: bigint,
    lines = 200,
  ): Promise<{ logs: string; status?: PreviewStatus; error?: string }> {
    const state = this.states.get(projectId.toString());
    const sandboxId =
      state?.sandboxId ?? (await this.projectSandbox(projectId));
    const logs = await this.readLogTail(sandboxId, lines);
    return { logs, status: state?.status, error: state?.error };
  }

  /**
   * Materialize the latest project files into the sandbox without starting the
   * preview. Used by the agent's `terminal` tool so builds/tests see the same
   * files the preview would.
   */
  async prepareSandbox(
    projectId: bigint,
  ): Promise<{ sandboxId: string; root: string }> {
    const sandboxId = await this.projectSandbox(projectId);
    const key = projectId.toString();
    const state = this.states.get(key);

    if (state && state.sandboxId !== sandboxId) {
      state.sandboxId = sandboxId;
      state.pid = undefined;
      state.signature = undefined;
      state.installed = false;
    }

    const files = await this.fileRepository.getAllFilesWithProjectId(projectId);
    const synced = await this.syncFiles(projectId, sandboxId, state, files);

    if (state) {
      state.signature = synced.signature;
      state.packageJson = synced.packageJson;
      state.lovableConf = synced.lovableConf;
      if (state.packageHash !== synced.packageHash) {
        state.packageHash = synced.packageHash;
        state.installed = false;
      }
      if (synced.changed) await this.stopTrackedServer(sandboxId, state);
    }

    return { sandboxId, root: PREVIEW_PROJECT_ROOT };
  }

  private toPublic(state: InternalState): PreviewState {
    return {
      status: state.status,
      url: state.status === 'ready' ? state.publicUrl : undefined,
      host: state.host,
      error: state.error,
    };
  }

  private async ensureInner(
    projectId: bigint,
    key: string,
  ): Promise<InternalState> {
    const sandboxId = await this.projectSandbox(projectId);
    const publicUrl = previewPublicUrl(key);

    let state = this.states.get(key);
    if (
      !state ||
      state.sandboxId !== sandboxId ||
      state.publicUrl !== publicUrl
    ) {
      state = {
        sandboxId,
        publicUrl,
        status: 'stopped',
        installed: false,
        checkedAt: 0,
      };
      this.states.set(key, state);
    }

    try {
      const files =
        await this.fileRepository.getAllFilesWithProjectId(projectId);

      const synced = await this.syncFiles(projectId, sandboxId, state, files);
      state.signature = synced.signature;
      state.packageJson = synced.packageJson;
      state.lovableConf = synced.lovableConf;
      if (state.packageHash !== synced.packageHash) {
        state.packageHash = synced.packageHash;
        state.installed = false;
      }
      if (synced.changed) {
        state.status = 'installing';
        // The file tree changed — never trust a server started from old files.
        await this.stopTrackedServer(sandboxId, state);
      }

      const commands = resolvePreviewCommands(
        parseLovableConfig(state.lovableConf),
        state.packageJson,
        PREVIEW_DEV_PORT,
      );
      if (!commands.start) {
        throw new Error(
          'No start command configured. Create a "lovable.conf" file at the project root with a line like: start: npm run dev -- --host 0.0.0.0 --port 3000',
        );
      }

      if (!state.installed) {
        state.status = 'installing';
        const needsInstall =
          Boolean(commands.install) &&
          !(await this.isInstalled(sandboxId, state.packageHash ?? ''));
        if (needsInstall) {
          await this.install(sandboxId, commands.install!);
          await this.writeInstallMarker(sandboxId, state.packageHash ?? '');
          await this.stopTrackedServer(sandboxId, state);
        }
        state.installed = true;
      }

      state.host = await this.e2bService.getHost(sandboxId, PREVIEW_DEV_PORT);
      state.status = 'starting';

      // Only trust a server we started in this process; after a restart the
      // sandbox may still hold an older dev server with a stale config.
      const alreadyUp = state.pid != null && (await this.isHealthy(state.host));
      if (!alreadyUp) {
        await this.stopTrackedServer(sandboxId, state);
        await this.killStaleServers(sandboxId);
        state.pid = await this.startDevServer(
          sandboxId,
          state.host,
          commands.start,
        );
        const ok = await this.waitForHealthy(state.host);
        if (!ok) {
          const logs = await this.readLogTail(sandboxId, 30);
          throw new Error(
            `Preview server did not become ready.${logs ? `\n${logs}` : ''}`,
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

  /** Resolve (or provision) the sandbox that backs a project's preview. */
  private async projectSandbox(projectId: bigint): Promise<string> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const ensured = await this.sandboxService.ensure(project.sandboxId ?? null);
    if (ensured.created) {
      await this.projectRepository.updateSandboxId(
        projectId,
        ensured.sandboxId,
      );
    }
    return ensured.sandboxId;
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

  /**
   * Bring the sandbox file tree in line with the database. A marker written
   * outside the project tree lets this survive backend restarts (and lets the
   * terminal tool reuse an already-synced sandbox without rewriting it).
   */
  private async syncFiles(
    projectId: bigint,
    sandboxId: string,
    state: InternalState | undefined,
    files: ProjectFile[],
  ): Promise<{
    signature: string;
    changed: boolean;
    packageHash: string;
    packageJson?: string;
    lovableConf?: string;
  }> {
    const signature = this.computeSignature(projectId, files);
    const marker = await this.readMarker(sandboxId, PREVIEW_SYNC_MARKER);

    if (marker === signature) {
      if (
        state &&
        state.signature === signature &&
        state.sandboxId === sandboxId
      ) {
        return {
          signature,
          changed: false,
          packageHash: state.packageHash ?? '',
          packageJson: state.packageJson,
          lovableConf: state.lovableConf,
        };
      }

      // Same files on disk, but this process has no cached metadata yet.
      const packageJson = await this.e2bService
        .readFile(sandboxId, `${PREVIEW_PROJECT_ROOT}/package.json`)
        .catch(() => undefined);
      const lovableConf = await this.e2bService
        .readFile(sandboxId, `${PREVIEW_PROJECT_ROOT}/lovable.conf`)
        .catch(() => undefined);
      return {
        signature,
        changed: false,
        packageHash: createHash('sha256')
          .update(packageJson ?? '')
          .digest('hex'),
        packageJson,
        lovableConf,
      };
    }

    const { entries, packageHash, packageJson, lovableConf } =
      await this.collectFiles(projectId, files);
    await this.materialize(sandboxId, entries);
    await this.writeMarker(sandboxId, PREVIEW_SYNC_MARKER, signature);
    return { signature, changed: true, packageHash, packageJson, lovableConf };
  }

  private async readMarker(sandboxId: string, path: string): Promise<string> {
    return this.e2bService.readFile(sandboxId, path).catch(() => '');
  }

  private async writeMarker(
    sandboxId: string,
    path: string,
    value: string,
  ): Promise<void> {
    await this.e2bService
      .writeFiles(sandboxId, [{ path, data: value }])
      .catch(() => undefined);
  }

  private async collectFiles(
    projectId: bigint,
    files: ProjectFile[],
  ): Promise<{
    entries: Array<{ path: string; data: string }>;
    packageHash: string;
    packageJson?: string;
    lovableConf?: string;
  }> {
    const resolver = new ProjectPathResolver(projectId, files);
    const merged = new Map<string, string>();

    for (const file of files) {
      if (file.type !== 'file') continue;
      const rel = resolver.pathOfId(file.id.toString());
      if (!rel || rel.includes('..') || rel.startsWith('/')) continue;
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
    const packageJson = merged.get('package.json');
    const packageHash = createHash('sha256')
      .update(packageJson ?? '')
      .digest('hex');

    return {
      entries,
      packageHash,
      packageJson,
      lovableConf: merged.get('lovable.conf'),
    };
  }

  /**
   * Replace the project tree with exactly what the database holds (so deleted
   * or renamed files do not linger) while keeping `node_modules` for reuse.
   */
  private async materialize(
    sandboxId: string,
    entries: Array<{ path: string; data: string }>,
  ): Promise<void> {
    await this.clearProject(sandboxId);
    for (let i = 0; i < entries.length; i += WRITE_BATCH_SIZE) {
      const batch = entries.slice(i, i + WRITE_BATCH_SIZE);
      await this.e2bService.writeFiles(sandboxId, batch, {
        requestTimeoutMs: 120_000,
      });
    }
  }

  private async clearProject(sandboxId: string): Promise<void> {
    await this.e2bService
      .runCommand(
        sandboxId,
        `mkdir -p ${PREVIEW_PROJECT_ROOT} && ` +
          `find ${PREVIEW_PROJECT_ROOT} -mindepth 1 -maxdepth 1 ` +
          `! -name node_modules -exec rm -rf {} +`,
        { timeoutMs: 60_000 },
      )
      .catch(() => undefined);
  }

  private async install(sandboxId: string, command: string): Promise<void> {
    this.logger.log(`Installing dependencies: ${command}`);
    const result = await this.e2bService.runCommand(sandboxId, command, {
      cwd: PREVIEW_PROJECT_ROOT,
      timeoutMs: PREVIEW_INSTALL_TIMEOUT_MS,
    });
    if (result.exitCode !== 0) {
      const output = (result.stderr || result.stdout).slice(-2000);
      throw new Error(
        `Dependency install failed (exit ${result.exitCode}): ${output}`,
      );
    }
    this.logger.log('Dependencies installed');
  }

  private async isInstalled(
    sandboxId: string,
    packageHash: string,
  ): Promise<boolean> {
    if (!packageHash) return false;
    try {
      const marker = await this.e2bService.readFile(
        sandboxId,
        PREVIEW_INSTALL_MARKER,
      );
      if (marker.trim() !== packageHash) return false;
      return await this.e2bService.exists(
        sandboxId,
        `${PREVIEW_PROJECT_ROOT}/node_modules`,
      );
    } catch {
      return false;
    }
  }

  private async writeInstallMarker(
    sandboxId: string,
    packageHash: string,
  ): Promise<void> {
    await this.e2bService
      .writeFiles(sandboxId, [
        { path: PREVIEW_INSTALL_MARKER, data: packageHash },
      ])
      .catch(() => undefined);
  }

  private async startDevServer(
    sandboxId: string,
    host: string,
    startCommand: string,
  ): Promise<number> {
    const command =
      `mkdir -p ${PREVIEW_STATE_DIR} && ` +
      `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=${host} ` +
      `PORT=${PREVIEW_DEV_PORT} HOST=0.0.0.0 ` +
      `${startCommand} > ${PREVIEW_LOG_PATH} 2>&1`;
    const { pid } = await this.e2bService.runBackground(sandboxId, command, {
      cwd: PREVIEW_PROJECT_ROOT,
    });
    this.logger.log(
      `Started dev server (pid ${pid}) on port ${PREVIEW_DEV_PORT}: ${startCommand}`,
    );
    return pid;
  }

  private async stopTrackedServer(
    sandboxId: string,
    state: InternalState,
  ): Promise<void> {
    if (state.pid == null) return;
    await this.e2bService
      .killProcess(sandboxId, state.pid)
      .catch(() => undefined);
    state.pid = undefined;
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
        process.cmd.includes('vite') ||
        process.args?.some(
          (arg) => arg.includes('vite') || arg.includes('next dev'),
        ) ||
        (process.cmd.includes('npm') &&
          process.args?.some((arg) => arg === 'dev')),
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

  private async readLogTail(sandboxId: string, lines: number): Promise<string> {
    const raw = await this.e2bService
      .readFile(sandboxId, PREVIEW_LOG_PATH)
      .catch(() => '');
    const trimmed = raw.trim();
    if (!trimmed) return '';
    const limit = Math.min(Math.max(lines, 1), 1000);
    return trimmed.split(/\r?\n/).slice(-limit).join('\n');
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
