import {
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type {
  FilesystemEvent,
  ProcessInfo,
  WatchHandle,
} from 'e2b';
import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { Subscription } from 'rxjs';

import { E2bService } from 'src/Modules/sandbox/e2b.service';
import {
  SandboxService,
  type EnsureResult,
} from 'src/Modules/sandbox/sandbox.service';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { DocumentStateService } from 'src/Modules/realtime/core/document-state.service';
import { ProjectRevisionService } from 'src/Modules/realtime/core/project-revision.service';
import {
  ProjectPathResolver,
  type ProjectNode,
} from 'src/Modules/ai/workspace/project-path.resolver';
import { ProjectMutationsService } from 'src/Modules/ai/workspace/project-mutations.service';
import { StorageService } from 'src/Modules/storage/storage.service';
import type { File as ProjectFile } from 'src/common/database/schema/projects/file.schema';

import {
  DEFAULT_TANSTACK_CONF,
  LOVABLE_CONF_PATH,
  parseLovableConfig,
  resolvePreviewCommands,
} from './lovable-conf';
import {
  PREVIEW_DEV_PORT,
  PREVIEW_INSTALL_MARKER,
  PREVIEW_INSTALL_TIMEOUT_MS,
  PREVIEW_LOG_PATH,
  PREVIEW_PROJECT_ROOT,
  PREVIEW_START_TIMEOUT_MS,
  PREVIEW_STATE_DIR,
  PREVIEW_SYNC_MARKER,
  PREVIEW_TEMPLATE_LOG_PATH,
  PREVIEW_TEMPLATE_PID_PATH,
  PREVIEW_TEMPLATE_START,
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
  /** Server-side token required by the sandbox proxy. Never send to clients. */
  trafficToken?: string;
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
  startCommand?: string;
  stopCommand?: string;
  healthCommand?: string;
  host?: string;
  trafficToken?: string;
  error?: string;
  checkedAt: number;
}

const WRITE_BATCH_SIZE = 50;
const DELETE_BATCH_SIZE = 50;
const SYNC_DEBOUNCE_MS = 300;
const SYNC_SUPPRESS_MS = 750;
const SANDBOX_KEEPALIVE_MS = 10 * 60_000;
const SYNC_IGNORED_SEGMENTS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  'coverage',
  '.turbo',
  '.cache',
  'tmp',
  '.pnpm-store',
  '.yarn',
]);

interface SyncBaseline {
  hash: string;
  size: number;
  mtime?: number;
  binary: boolean;
  text?: string;
}

interface SyncMarker {
  signature: string;
  revision: number;
  files: Record<string, SyncBaseline>;
}

interface SyncSession {
  projectId: string;
  sandboxId: string;
  watcher?: WatchHandle;
  watcherStopped: boolean;
  applying: boolean;
  recovering?: boolean;
  pendingFileIds: Set<string>;
  pendingPaths: Set<string>;
  pendingTree: boolean;
  pendingImportTree: boolean;
  pushTimer?: NodeJS.Timeout;
  importTimer?: NodeJS.Timeout;
  reconnectTimer?: NodeJS.Timeout;
  keepAliveTimer?: NodeJS.Timeout;
  lastRevision: number;
  baseline: Map<string, SyncBaseline>;
  suppressUntil: number;
}

interface SandboxManifestEntry {
  path: string;
  size: number;
  mtime: number;
}

interface SyncResult {
  signature: string;
  changed: boolean;
  packageHash: string;
  packageJson?: string;
  lovableConf?: string;
  revision: number;
  baseline: Map<string, SyncBaseline>;
}

@Injectable()
export class PreviewService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PreviewService.name);
  private readonly states = new Map<string, InternalState>();
  private readonly inflight = new Map<string, Promise<InternalState>>();
  private readonly syncSessions = new Map<string, SyncSession>();
  /** Projects whose sandbox has never been provisioned (never materialized). */
  private readonly freshProjects = new Set<string>();
  /** Serializes sandbox attaches per project (see `attach`). */
  private readonly attachInflight = new Map<string, Promise<void>>();
  /** Coalesces concurrent sandbox provisioning for the same project. */
  private readonly sandboxInflight = new Map<string, Promise<EnsureResult>>();
  private revisionSubscription?: Subscription;

  constructor(
    private readonly e2bService: E2bService,
    private readonly sandboxService: SandboxService,
    private readonly projectRepository: ProjectRepository,
    private readonly fileRepository: FileRepository,
    private readonly documentState: DocumentStateService,
    private readonly projectRevision: ProjectRevisionService,
    private readonly projectMutations: ProjectMutationsService,
    private readonly storageService: StorageService,
  ) {}

  onModuleInit(): void {
    this.revisionSubscription = this.projectRevision.changes$.subscribe(
      (change) => {
        const session = this.syncSessions.get(change.projectId);
        if (!session) return;
        if (change.kind === 'tree') {
          session.pendingTree = true;
        } else if (change.fileId) {
          session.pendingFileIds.add(change.fileId);
        }
        this.schedulePush(change.projectId);
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.revisionSubscription?.unsubscribe();
    await Promise.all(
      [...this.syncSessions.keys()].map((projectId) =>
        this.detach(BigInt(projectId)),
      ),
    );
  }

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
      (await this.isSyncCurrent(projectId))
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

  /**
   * Look up a preview that is already serving, without starting one.
   *
   * Used for unauthenticated host traffic (Google OAuth returns send no
   * Loveble cookies). In-memory `peek` is empty after `--watch` restarts, so
   * we reconnect to the project's stored sandbox when that port is healthy.
   */
  async resolveRunning(projectId: bigint): Promise<PreviewState | undefined> {
    const peeked = this.peek(projectId);
    if (peeked?.url && peeked.host) return peeked;

    const project = await this.projectRepository.findById(projectId);
    const sandboxId = project?.sandboxId;
    if (!sandboxId) return undefined;

    try {
      const host = await this.e2bService.getHost(sandboxId, PREVIEW_DEV_PORT);
      const trafficToken = this.e2bService.trafficToken(sandboxId);
      if (!(await this.isHealthy(host, trafficToken))) return undefined;

      const key = projectId.toString();
      let state = this.states.get(key);
      if (!state || state.sandboxId !== sandboxId) {
        state = {
          sandboxId,
          publicUrl: previewPublicUrl(key),
          status: 'ready',
          installed: true,
          checkedAt: Date.now(),
        };
        this.states.set(key, state);
      }
      state.host = host;
      state.trafficToken = trafficToken;
      state.status = 'ready';
      state.error = undefined;
      state.checkedAt = Date.now();
      return this.toPublic(state);
    } catch {
      return undefined;
    }
  }

  /** Stop the preview server without detaching the synced sandbox. */
  async stop(projectId: bigint): Promise<void> {
    const state = this.states.get(projectId.toString());
    if (!state) return;
    await this.stopTrackedServer(state.sandboxId, state);
    state.status = 'stopped';
    state.host = undefined;
    state.trafficToken = undefined;
    state.checkedAt = 0;
  }

  async restart(projectId: bigint): Promise<PreviewState> {
    await this.stop(projectId);
    return this.ensure(projectId, { force: true });
  }

  async health(
    projectId: bigint,
  ): Promise<{ ok: boolean; message: string }> {
    const state = this.states.get(projectId.toString());
    if (!state?.host) {
      return { ok: false, message: 'Preview is not running.' };
    }
    if (state.healthCommand) {
      const result = await this.e2bService
        .runCommand(state.sandboxId, state.healthCommand, {
          cwd: PREVIEW_PROJECT_ROOT,
          timeoutMs: 15_000,
        })
        .catch(() => undefined);
      if (result?.exitCode === 0) {
        return {
          ok: true,
          message: result.stdout.trim() || 'Preview is healthy.',
        };
      }
      return {
        ok: false,
        message:
          result?.stdout.trim() ||
          result?.stderr.trim() ||
          'Health check failed.',
      };
    }
    const ok = await this.isHealthy(state.host, state.trafficToken);
    return {
      ok,
      message: ok ? 'Preview is healthy.' : 'Preview is not responding.',
    };
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
    // console.log('[preview.service] ensureInner start; projectId:', projectId.toString());
    const sandboxId = await this.projectSandbox(projectId);
    const key = projectId.toString();
    const state = this.states.get(key);

    if (state && state.sandboxId !== sandboxId) {
      state.sandboxId = sandboxId;
      state.pid = undefined;
      state.startCommand = undefined;
      state.stopCommand = undefined;
      state.healthCommand = undefined;
      state.signature = undefined;
      state.host = undefined;
      state.trafficToken = undefined;
      state.installed = false;
    }

    await this.attach(projectId, sandboxId);
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
    this.updateSessionFromSync(projectId, sandboxId, synced);

    return { sandboxId, root: PREVIEW_PROJECT_ROOT };
  }

  private toPublic(state: InternalState): PreviewState {
    return {
      status: state.status,
      url: state.status === 'ready' ? state.publicUrl : undefined,
      host: state.host,
      trafficToken: state.trafficToken,
      error: state.error,
    };
  }

  private async ensureInner(
    projectId: bigint,
    key: string,
  ): Promise<InternalState> {
    // console.log('[preview.service] ensureInner start; projectId:', projectId.toString());
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
      await this.attach(projectId, sandboxId);
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
      this.updateSessionFromSync(projectId, sandboxId, synced);
      if (synced.changed) {
        state.status = 'installing';
        // The file tree changed â€” never trust a server started from old files.
        await this.stopTrackedServer(sandboxId, state);
      }

      const commands = resolvePreviewCommands(
        parseLovableConfig(state.lovableConf),
        state.packageJson,
        PREVIEW_DEV_PORT,
      );
      if (!commands.start) {
        throw new Error(
          'No start command configured. Add a "start:" line to lovable.conf with a shell command that serves the app on 0.0.0.0:3000.',
        );
      }
      state.startCommand = commands.start;
      state.stopCommand = commands.stop;
      state.healthCommand = commands.health;

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
      state.trafficToken = this.e2bService.trafficToken(sandboxId);
      state.status = 'starting';

      // The template start command runs during the E2B build, so a fresh
      // sandbox may already have a healthy dev server. Adopt it instead of
      // killing it and paying for another cold start.
      const templateStart = this.isTemplateStart(commands.start);
      const alreadyUp =
        (await this.isHealthy(state.host, state.trafficToken)) &&
        (state.pid != null || templateStart);
      if (alreadyUp && state.pid == null && templateStart) {
        state.pid = await this.readTemplatePid(sandboxId);
      }
      if (!alreadyUp) {
        await this.stopTrackedServer(sandboxId, state);
        await this.killStaleServers(sandboxId);
        state.pid = await this.startDevServer(
          sandboxId,
          state.host,
          commands.start,
        );
        const ok = await this.waitForReady(
          sandboxId,
          state.host,
          state.trafficToken,
          commands.health,
        );
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

  /**
   * Resolve (or provision) the sandbox that backs a project.
   *
   * Single-flighted per project: the project page (openProject), the preview
   * ensure and the first build agent can all ask for a sandbox at the same
   * moment. Without the lock each of them would call `SandboxService.ensure`
   * with the stored id (still null for a new project) and provision its own
   * sandbox, orphaning the others.
   */
  async ensureSandbox(projectId: bigint): Promise<EnsureResult> {
    const key = projectId.toString();
    const inflight = this.sandboxInflight.get(key);
    if (inflight) return inflight;

    const task = this.ensureSandboxInner(projectId).finally(() => {
      if (this.sandboxInflight.get(key) === task) {
        this.sandboxInflight.delete(key);
      }
    });

    this.sandboxInflight.set(key, task);
    return task;
  }

  private async ensureSandboxInner(projectId: bigint): Promise<EnsureResult> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    // No stored sandbox means this project has never been materialized: the
    // next attach may adopt the template as its starting point.
    if (!project.sandboxId) this.freshProjects.add(projectId.toString());

    const ensured = await this.sandboxService.ensure(project.sandboxId ?? null);
    if (ensured.created) {
      await this.projectRepository.updateSandboxId(
        projectId,
        ensured.sandboxId,
      );
    }
    return ensured;
  }

  /** Resolve (or provision) the sandbox that backs a project's preview. */
  private async projectSandbox(projectId: bigint): Promise<string> {
    const ensured = await this.ensureSandbox(projectId);
    return ensured.sandboxId;
  }

  // --------------------------------------------------------------- sync ---

  async attach(projectId: bigint, sandboxId: string): Promise<void> {
    const key = projectId.toString();

    // Serialize attaches per project. The project page (openProject), the
    // preview ensure and the build agent can all prepare the same sandbox at
    // the same moment; two concurrent attaches would both seed the template
    // into the database.
    const pending = this.attachInflight.get(key);
    if (pending) {
      await pending.catch(() => undefined);
    }

    const task = this.attachInner(projectId, sandboxId).finally(() => {
      if (this.attachInflight.get(key) === task) {
        this.attachInflight.delete(key);
      }
    });

    this.attachInflight.set(key, task);
    await task;
  }

  private async attachInner(
    projectId: bigint,
    sandboxId: string,
  ): Promise<void> {
    const key = projectId.toString();
    const existing = this.syncSessions.get(key);
    if (existing?.sandboxId === sandboxId) return;
    if (existing) await this.detach(projectId);

    const session: SyncSession = {
      projectId: key,
      sandboxId,
      watcherStopped: false,
      applying: false,
      pendingFileIds: new Set(),
      pendingPaths: new Set(),
      pendingTree: false,
      pendingImportTree: false,
      lastRevision: 0,
      baseline: new Map(),
      suppressUntil: 0,
    };
    this.syncSessions.set(key, session);

    await this.e2bService
      .runCommand(sandboxId, `mkdir -p ${PREVIEW_PROJECT_ROOT}`, {
        timeoutMs: 10_000,
      })
      .catch((err) =>
        this.logger.warn(
          `could not create sandbox project root for ${key}: ${String(err)}`,
        ),
      );

    const marker = await this.readSyncMarker(sandboxId);
    const hasProjectFiles = await this.fileRepository
      .getAllFilesWithProjectId(projectId)
      .then((files) => files.length > 0)
      .catch(() => false);
    // Only a project that was never materialized (no sandbox ever provisioned)
    // adopts the template. An existing project whose sandbox expired must keep
    // the database as the source of truth, even when the user deleted every
    // file — otherwise the template would resurrect on every sandbox expiry.
    const isFreshProject = this.freshProjects.delete(key);

    if (marker) {
      session.baseline = new Map(Object.entries(marker.files));
      session.lastRevision = marker.revision;
      session.applying = true;
      try {
        await this.importSandboxChanges(session, true);
      } catch (err) {
        this.logger.warn(
          `initial sandbox import failed for ${key}: ${String(err)}`,
        );
      } finally {
        session.applying = false;
      }
    } else if (!hasProjectFiles && isFreshProject) {
      // Brand-new project: nothing was materialized yet and the E2B template is
      // the intended starting point. Adopt the template tree into the database
      // so the file explorer and the (DB-backed) agent workspace both start
      // from the scaffold instead of an empty project. Agents that are about to
      // run wait for this (see ensureProjectMaterialized).
      this.logger.log(
        `seeding new project ${key} from the template sandbox — agents wait for this to finish`,
      );
      session.applying = true;
      try {
        await this.importSandboxChanges(session, true);
        const seeded = await this.fileRepository
          .getAllFilesWithProjectId(projectId)
          .catch(() => []);
        if (seeded.length > 0) {
          this.logger.log(
            `seeded new project ${key} from the template sandbox (${seeded.length} files)`,
          );
        } else {
          this.logger.warn(
            `template seed for ${key} produced no files — check that the E2B template ships ${PREVIEW_PROJECT_ROOT}`,
          );
        }
      } catch (err) {
        this.logger.warn(`template seed failed for ${key}: ${String(err)}`);
      } finally {
        session.applying = false;
      }
    } else {
      // Expired sandbox for an existing project: the database is authoritative,
      // so importing here would resurrect template files the user (or the agent)
      // deleted. Just restore from the database below.
      this.logger.log(
        `fresh sandbox for ${key} — restoring the project from the database`,
      );
    }

    await this.ensureTemplateManifest(projectId, sandboxId);

    try {
      const files =
        await this.fileRepository.getAllFilesWithProjectId(projectId);
      const synced = await this.syncFiles(
        projectId,
        sandboxId,
        undefined,
        files,
      );
      this.updateSessionFromSync(projectId, sandboxId, synced);
    } catch (err) {
      this.logger.warn(`initial sync failed for ${key}: ${String(err)}`);
    }

    await this.startWatcher(session);

    void this.e2bService.extend(sandboxId).catch(() => undefined);
    session.keepAliveTimer = setInterval(() => {
      void this.e2bService.extend(sandboxId).catch((err) => {
        this.logger.warn(
          `sandbox keepalive failed for ${key}: ${String(err)}`,
        );
      });
    }, SANDBOX_KEEPALIVE_MS);
    session.keepAliveTimer.unref();
  }

  /**
   * The E2B template ships the TanStack Start app but no `lovable.conf`.
   * Add the template manifest once, to both the database and the sandbox, so
   * preview/terminal commands and future sandbox recreations use the baked-in
   * dev-server/health scripts.
   */
  private async ensureTemplateManifest(
    projectId: bigint,
    sandboxId: string,
  ): Promise<void> {
    try {
      const files =
        await this.fileRepository.getAllFilesWithProjectId(projectId);
      const resolver = new ProjectPathResolver(projectId, files);
      const hasManifest = files.some(
        (file) =>
          file.type === 'file' &&
          resolver.pathOfId(file.id.toString()) === LOVABLE_CONF_PATH,
      );
      if (hasManifest) return;

      const packageJson = await this.e2bService
        .readFile(sandboxId, `${PREVIEW_PROJECT_ROOT}/package.json`)
        .catch(() => '');
      if (!packageJson.includes('@tanstack/react-start')) return;

      await this.e2bService.writeFiles(sandboxId, [
        {
          path: `${PREVIEW_PROJECT_ROOT}/${LOVABLE_CONF_PATH}`,
          data: DEFAULT_TANSTACK_CONF,
        },
      ]);
      await this.projectMutations.writeFile(
        projectId,
        LOVABLE_CONF_PATH,
        DEFAULT_TANSTACK_CONF,
      );
      this.logger.log(
        `seeded TanStack template manifest for project ${projectId}`,
      );
    } catch (err) {
      this.logger.warn(
        `could not seed template manifest for ${projectId}: ${String(err)}`,
      );
    }
  }

  async detach(projectId: bigint): Promise<void> {
    const key = projectId.toString();
    const session = this.syncSessions.get(key);
    if (!session) return;
    session.watcherStopped = true;
    if (session.pushTimer) clearTimeout(session.pushTimer);
    if (session.importTimer) clearTimeout(session.importTimer);
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
    if (session.keepAliveTimer) clearInterval(session.keepAliveTimer);
    await session.watcher?.stop().catch(() => undefined);
    for (let i = 0; i < 20 && session.applying; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.syncSessions.delete(key);
  }

  async flush(projectId: bigint): Promise<void> {
    const key = projectId.toString();
    const session = this.syncSessions.get(key);
    if (!session) return;
    for (let i = 0; i < 20 && session.applying; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (session.pushTimer) {
      clearTimeout(session.pushTimer);
      session.pushTimer = undefined;
    }
    if (session.importTimer) {
      clearTimeout(session.importTimer);
      session.importTimer = undefined;
    }
    await this.flushPush(projectId);
    await this.flushImport(projectId);
  }

  private async isSyncCurrent(projectId: bigint): Promise<boolean> {
    const session = this.syncSessions.get(projectId.toString());
    if (!session) return false;
    if (
      session.pendingTree ||
      session.pendingImportTree ||
      session.pendingFileIds.size > 0 ||
      session.pendingPaths.size > 0
    ) {
      return false;
    }
    return (
      session.lastRevision === (await this.projectRevision.get(projectId))
    );
  }

  private updateSessionFromSync(
    projectId: bigint,
    sandboxId: string,
    synced: SyncResult,
  ): void {
    const session = this.syncSessions.get(projectId.toString());
    if (!session || session.sandboxId !== sandboxId) return;
    session.baseline = synced.baseline;
    session.lastRevision = synced.revision;
    session.suppressUntil = Date.now() + SYNC_SUPPRESS_MS;
  }

  private async startWatcher(session: SyncSession): Promise<void> {
    if (
      session.watcherStopped ||
      this.syncSessions.get(session.projectId) !== session
    ) {
      return;
    }
    try {
      session.watcher = await this.e2bService.watchDir(
        session.sandboxId,
        PREVIEW_PROJECT_ROOT,
        (event) => this.onWatchEvent(session, event),
        {
          recursive: true,
          timeoutMs: 0,
          includeEntry: true,
          onExit: (err) => {
            if (
              session.watcherStopped ||
              this.syncSessions.get(session.projectId) !== session
            ) {
              return;
            }
            this.logger.warn(
              `sandbox watcher exited for ${session.projectId}: ${
                err?.message ?? 'unknown'
              }`,
            );
            if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
            session.reconnectTimer = setTimeout(() => {
              session.reconnectTimer = undefined;
              void this.recoverSandbox(session);
            }, 1000);
          },
        },
      );
    } catch (err) {
      this.logger.warn(
        `could not watch sandbox for ${session.projectId}: ${String(err)}`,
      );
      if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
      session.reconnectTimer = setTimeout(() => {
        session.reconnectTimer = undefined;
        void this.recoverSandbox(session);
      }, 2000);
    }
  }

  /**
   * The sandbox can expire even while the backend is running. Verify it, and
   * when E2B has already killed it, provision a replacement and rematerialize
   * the database tree before watching the new sandbox.
   */
  private async recoverSandbox(session: SyncSession): Promise<void> {
    if (
      session.recovering ||
      session.watcherStopped ||
      this.syncSessions.get(session.projectId) !== session
    ) {
      return;
    }

    session.recovering = true;
    const projectId = BigInt(session.projectId);
    try {
      const ensured = await this.sandboxService.ensure(session.sandboxId);
      if (
        session.watcherStopped ||
        this.syncSessions.get(session.projectId) !== session
      ) {
        if (ensured.created) {
          await this.sandboxService
            .destroy(ensured.sandboxId)
            .catch(() => undefined);
        }
        return;
      }

      if (!ensured.created) {
        await this.startWatcher(session);
        return;
      }

      this.logger.warn(
        `sandbox ${session.sandboxId} expired for project ${session.projectId}; ` +
          `replaced with ${ensured.sandboxId}`,
      );
      const project = await this.projectRepository.updateSandboxId(
        projectId,
        ensured.sandboxId,
      );
      if (!project) {
        await this.sandboxService
          .destroy(ensured.sandboxId)
          .catch(() => undefined);
        return;
      }
      session.sandboxId = ensured.sandboxId;
      session.baseline = new Map();
      session.lastRevision = 0;
      session.pendingFileIds.clear();
      session.pendingPaths.clear();
      session.pendingTree = false;
      session.pendingImportTree = false;

      const state = this.states.get(session.projectId);
      if (state) {
        state.sandboxId = ensured.sandboxId;
        state.status = 'stopped';
        state.signature = undefined;
        state.packageHash = undefined;
        state.packageJson = undefined;
        state.lovableConf = undefined;
        state.installed = false;
        state.pid = undefined;
        state.startCommand = undefined;
        state.stopCommand = undefined;
        state.healthCommand = undefined;
        state.host = undefined;
        state.trafficToken = undefined;
        state.error = undefined;
        state.checkedAt = 0;
      }

      await this.e2bService
        .runCommand(ensured.sandboxId, `mkdir -p ${PREVIEW_PROJECT_ROOT}`, {
          timeoutMs: 10_000,
        })
        .catch((err) =>
          this.logger.warn(
            `could not create sandbox project root for ${session.projectId}: ${String(err)}`,
          ),
        );

      const files =
        await this.fileRepository.getAllFilesWithProjectId(projectId);
      const synced = await this.syncFiles(
        projectId,
        ensured.sandboxId,
        state,
        files,
      );
      this.updateSessionFromSync(projectId, ensured.sandboxId, synced);
      if (state) {
        state.signature = synced.signature;
        state.packageJson = synced.packageJson;
        state.lovableConf = synced.lovableConf;
        if (state.packageHash !== synced.packageHash) {
          state.packageHash = synced.packageHash;
          state.installed = false;
        }
      }

      if (
        session.watcherStopped ||
        this.syncSessions.get(session.projectId) !== session
      ) {
        return;
      }
      await this.startWatcher(session);
    } catch (err) {
      this.logger.warn(
        `sandbox recovery failed for ${session.projectId}: ${String(err)}`,
      );
      if (
        !session.watcherStopped &&
        this.syncSessions.get(session.projectId) === session
      ) {
        if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
        session.reconnectTimer = setTimeout(() => {
          session.reconnectTimer = undefined;
          void this.recoverSandbox(session);
        }, 5000);
      }
    } finally {
      session.recovering = false;
    }
  }

  private onWatchEvent(session: SyncSession, event: FilesystemEvent): void {
    if (session.watcherStopped) {
      return;
    }
    const rel = this.normalizeSandboxPath(event.name);
    if (!rel || this.isIgnored(rel)) return;
    if (event.type === 'rename') {
      session.pendingImportTree = true;
    } else {
      session.pendingPaths.add(rel);
    }
    this.scheduleImport(session.projectId);
  }

  private schedulePush(projectId: string): void {
    const session = this.syncSessions.get(projectId);
    if (!session) return;
    if (session.pushTimer) clearTimeout(session.pushTimer);
    session.pushTimer = setTimeout(() => {
      session.pushTimer = undefined;
      void this.flushPush(BigInt(projectId));
    }, SYNC_DEBOUNCE_MS);
  }

  private scheduleImport(projectId: string): void {
    const session = this.syncSessions.get(projectId);
    if (!session) return;
    if (session.importTimer) clearTimeout(session.importTimer);
    session.importTimer = setTimeout(() => {
      session.importTimer = undefined;
      void this.flushImport(BigInt(projectId));
    }, SYNC_DEBOUNCE_MS);
  }

  private async flushPush(projectId: bigint): Promise<void> {
    const key = projectId.toString();
    const session = this.syncSessions.get(key);
    if (!session) return;
    if (session.applying) {
      this.schedulePush(key);
      return;
    }
    if (!session.pendingTree && session.pendingFileIds.size === 0) return;

    if (session.pendingImportTree || session.pendingPaths.size > 0) {
      await this.flushImport(projectId);
      if (!this.syncSessions.has(key)) return;
    }

    session.applying = true;
    let touchedConfig = false;
    try {
      if (session.pendingTree) {
        const files =
          await this.fileRepository.getAllFilesWithProjectId(projectId);
        const state = this.states.get(key);
        const synced = await this.syncFiles(
          projectId,
          session.sandboxId,
          state,
          files,
        );
        this.updateSessionFromSync(projectId, session.sandboxId, synced);
        session.pendingTree = false;
        session.pendingFileIds.clear();
        if (state) {
          state.signature = synced.signature;
          state.packageJson = synced.packageJson;
          state.lovableConf = synced.lovableConf;
          if (state.packageHash !== synced.packageHash) {
            state.packageHash = synced.packageHash;
            state.installed = false;
          }
          await this.stopTrackedServer(session.sandboxId, state);
        }
      } else {
        const ids = [...session.pendingFileIds];
        session.pendingFileIds.clear();
        for (const fileId of ids) {
          const rel = await this.pushFileToSandbox(session, fileId);
          if (rel && this.isPreviewConfig(rel)) touchedConfig = true;
        }
        if (touchedConfig) await this.restartPreviewForConfig(session);
        await this.refreshSyncMarker(session);
      }
      session.lastRevision = await this.projectRevision.get(projectId);
    } catch (err) {
      this.logger.warn(
        `push to sandbox failed for ${key}: ${String(err)}`,
      );
    } finally {
      session.applying = false;
      if (session.pendingTree || session.pendingFileIds.size > 0) {
        this.schedulePush(key);
      }
    }
  }

  private async pushFileToSandbox(
    session: SyncSession,
    fileId: string,
  ): Promise<string | undefined> {
    const projectId = BigInt(session.projectId);
    const files =
      await this.fileRepository.getAllFilesWithProjectId(projectId);
    const resolver = new ProjectPathResolver(projectId, files);
    const rel = resolver.pathOfId(fileId);
    if (!rel || this.isIgnored(rel)) return undefined;
    const file = files.find((item) => item.id.toString() === fileId);
    if (!file || file.type !== 'file') return rel;

    try {
      let data: string | Uint8Array;
      if (file.isBinary) {
        data = file.storageKey
          ? await this.storageService.downloadBytes(file.storageKey)
          : new Uint8Array();
      } else {
        data = (await this.documentState.getDocument(fileId)).doc;
      }
      const hash = createHash('sha256').update(data).digest('hex');
      const baseline = session.baseline.get(rel);
      if (baseline?.hash === hash) return rel;

      await this.e2bService.writeFiles(
        session.sandboxId,
        [{ path: `${PREVIEW_PROJECT_ROOT}/${rel}`, data }],
        { requestTimeoutMs: 120_000 },
      );
      session.suppressUntil = Date.now() + SYNC_SUPPRESS_MS;
      session.baseline.set(rel, {
        hash,
        size:
          typeof data === 'string'
            ? Buffer.byteLength(data, 'utf8')
            : data.byteLength,
        binary: file.isBinary,
        text: typeof data === 'string' ? data : undefined,
      });
      return rel;
    } catch (err) {
      this.logger.warn(`could not push ${rel}: ${String(err)}`);
      return rel;
    }
  }

  private async refreshSyncMarker(session: SyncSession): Promise<void> {
    const projectId = BigInt(session.projectId);
    const files =
      await this.fileRepository.getAllFilesWithProjectId(projectId);
    const revision = await this.projectRevision.get(projectId);
    const signature = this.computeSignature(projectId, files, revision);
    await this.writeSyncMarker(session.sandboxId, {
      signature,
      revision,
      files: Object.fromEntries(session.baseline),
    });
    session.lastRevision = revision;
  }

  private async flushImport(projectId: bigint): Promise<void> {
    const key = projectId.toString();
    const session = this.syncSessions.get(key);
    if (!session) return;
    if (session.applying) {
      this.scheduleImport(key);
      return;
    }
    if (
      !session.pendingImportTree &&
      session.pendingPaths.size === 0
    ) {
      return;
    }

    session.applying = true;
    let touchedConfig = false;
    try {
      if (session.pendingImportTree) {
        session.pendingImportTree = false;
        session.pendingPaths.clear();
        await this.importSandboxChanges(session, false);
      } else {
        const paths = [...session.pendingPaths];
        session.pendingPaths.clear();
        for (const rel of paths) {
          const changed = await this.importSandboxPath(session, rel);
          if (changed && this.isPreviewConfig(rel)) touchedConfig = true;
        }
      }
      const files =
        await this.fileRepository.getAllFilesWithProjectId(projectId);
      const state = this.states.get(key);
      const synced = await this.syncFiles(
        projectId,
        session.sandboxId,
        state,
        files,
      );
      this.updateSessionFromSync(projectId, session.sandboxId, synced);
      if (state) {
        state.signature = synced.signature;
        state.packageJson = synced.packageJson;
        state.lovableConf = synced.lovableConf;
        if (state.packageHash !== synced.packageHash) {
          state.packageHash = synced.packageHash;
          state.installed = false;
        }
      }
      if (touchedConfig) await this.restartPreviewForConfig(session);
    } catch (err) {
      this.logger.warn(
        `import from sandbox failed for ${key}: ${String(err)}`,
      );
    } finally {
      session.applying = false;
      if (session.pendingImportTree || session.pendingPaths.size > 0) {
        this.scheduleImport(key);
      }
    }
  }

  private async importSandboxChanges(
    session: SyncSession,
    initial: boolean,
  ): Promise<void> {
    const manifest = await this.listSandboxFiles(session.sandboxId);
    if (!manifest) return;
    const present = new Set(manifest.map((entry) => entry.path));
    const projectId = BigInt(session.projectId);
    const files =
      await this.fileRepository.getAllFilesWithProjectId(projectId);
    const resolver = new ProjectPathResolver(projectId, files);

    for (const entry of manifest) {
      if (this.isIgnored(entry.path)) continue;
      const baseline = session.baseline.get(entry.path);
      if (initial && !baseline && resolver.resolve(entry.path)) {
        continue;
      }
      if (
        initial &&
        baseline &&
        baseline.size === entry.size &&
        baseline.mtime != null &&
        Math.abs(baseline.mtime - entry.mtime) < 1
      ) {
        continue;
      }
      await this.importSandboxPath(session, entry.path);
    }

    for (const file of files) {
      if (file.type !== 'file') continue;
      const rel = resolver.pathOfId(file.id.toString());
      if (!rel || this.isIgnored(rel) || present.has(rel)) continue;
      await this.importSandboxDeletion(session, rel);
    }
  }

  private async importSandboxPath(
    session: SyncSession,
    path: string,
  ): Promise<boolean> {
    const rel = this.normalizeSandboxPath(path);
    if (!rel || this.isIgnored(rel)) return false;

    let info;
    try {
      info = await this.e2bService.getInfo(
        session.sandboxId,
        `${PREVIEW_PROJECT_ROOT}/${rel}`,
      );
    } catch {
      return this.importSandboxDeletion(session, rel);
    }
    if (info.type !== 'file') return false;

    let bytes: Uint8Array;
    try {
      bytes = await this.e2bService.readFileBytes(
        session.sandboxId,
        `${PREVIEW_PROJECT_ROOT}/${rel}`,
      );
    } catch {
      return this.importSandboxDeletion(session, rel);
    }

    const binary = this.isBinaryBytes(bytes);
    const contentType = this.contentTypeFor(rel, bytes);
    const projectId = BigInt(session.projectId);
    const files =
      await this.fileRepository.getAllFilesWithProjectId(projectId);
    const resolver = new ProjectPathResolver(projectId, files);
    const node = resolver.resolve(rel);
    const sandboxHash = createHash('sha256').update(bytes).digest('hex');

    if (!node) {
      await this.writeSandboxFile(session, rel, bytes, binary, contentType);
      return true;
    }
    if (node.type !== 'file') return false;
    if (node.isBinary !== binary) {
      await this.handleConflict(
        session,
        rel,
        node,
        bytes,
        binary,
        contentType,
      );
      return true;
    }

    const dbBytes = node.isBinary
      ? await this.readStoredBytes(node.storageKey)
      : Buffer.from(
          (await this.documentState.getDocument(node.id.toString())).doc,
          'utf8',
        );
    const dbHash = createHash('sha256').update(dbBytes).digest('hex');
    if (dbHash === sandboxHash) {
      this.setBaseline(session, rel, bytes, binary);
      return false;
    }

    const baseline = session.baseline.get(rel);
    if (!baseline) {
      await this.handleConflict(
        session,
        rel,
        node,
        bytes,
        binary,
        contentType,
      );
      return true;
    }

    const dbChanged = dbHash !== baseline.hash;
    const sandboxChanged = sandboxHash !== baseline.hash;
    if (!dbChanged) {
      await this.writeSandboxFile(session, rel, bytes, binary, contentType);
      return true;
    }
    if (!sandboxChanged) return false;

    await this.handleConflict(session, rel, node, bytes, binary, contentType);
    return true;
  }

  private async importSandboxDeletion(
    session: SyncSession,
    path: string,
  ): Promise<boolean> {
    const rel = this.normalizeSandboxPath(path);
    if (!rel || this.isIgnored(rel)) return false;
    const projectId = BigInt(session.projectId);
    const files =
      await this.fileRepository.getAllFilesWithProjectId(projectId);
    const resolver = new ProjectPathResolver(projectId, files);
    const node = resolver.resolve(rel);
    if (!node) {
      session.baseline.delete(rel);
      return false;
    }
    if (node.type === 'folder') return false;

    const dbBytes = node.isBinary
      ? await this.readStoredBytes(node.storageKey)
      : Buffer.from(
          (await this.documentState.getDocument(node.id.toString())).doc,
          'utf8',
        );
    const dbHash = createHash('sha256').update(dbBytes).digest('hex');
    const baseline = session.baseline.get(rel);
    if (baseline && baseline.hash === dbHash) {
      await this.projectMutations.deletePath(projectId, rel, false);
      session.baseline.delete(rel);
      return true;
    }
    return false;
  }

  private async writeSandboxFile(
    session: SyncSession,
    rel: string,
    bytes: Uint8Array,
    binary: boolean,
    contentType: string,
  ): Promise<void> {
    const projectId = BigInt(session.projectId);
    if (binary) {
      await this.projectMutations.writeBinaryFile(
        projectId,
        rel,
        bytes,
        contentType,
      );
    } else {
      await this.projectMutations.writeFile(
        projectId,
        rel,
        Buffer.from(bytes).toString('utf8'),
      );
    }
    this.setBaseline(session, rel, bytes, binary);
  }

  private async handleConflict(
    session: SyncSession,
    rel: string,
    node: ProjectNode,
    sandboxBytes: Uint8Array,
    binary: boolean,
    contentType: string,
  ): Promise<void> {
    const projectId = BigInt(session.projectId);
    const stamp = Date.now();
    const projectCopy = `${rel}.conflict-project-${stamp}`;

    if (binary) {
      const dbBytes = await this.readStoredBytes(node.storageKey);
      await this.projectMutations.writeBinaryFile(
        projectId,
        projectCopy,
        dbBytes,
        contentType,
      );
      this.setBaseline(session, projectCopy, dbBytes, true);
      await this.projectMutations.writeBinaryFile(
        projectId,
        rel,
        sandboxBytes,
        contentType,
      );
      this.setBaseline(session, rel, sandboxBytes, true);
      await this.e2bService.writeFiles(
        session.sandboxId,
        [
          {
            path: `${PREVIEW_PROJECT_ROOT}/${projectCopy}`,
            data: dbBytes,
          },
        ],
        { requestTimeoutMs: 120_000 },
      );
    } else {
      const dbText = (
        await this.documentState.getDocument(node.id.toString())
      ).doc;
      const sandboxText = Buffer.from(sandboxBytes).toString('utf8');
      await this.projectMutations.writeFile(projectId, projectCopy, dbText);
      this.setBaseline(
        session,
        projectCopy,
        Buffer.from(dbText, 'utf8'),
        false,
      );
      const conflict =
        `<<<<<<< project\n${dbText}\n=======\n${sandboxText}\n>>>>>>> sandbox\n`;
      await this.projectMutations.writeFile(projectId, rel, conflict);
      this.setBaseline(session, rel, Buffer.from(conflict, 'utf8'), false);
      await this.e2bService.writeFiles(
        session.sandboxId,
        [
          {
            path: `${PREVIEW_PROJECT_ROOT}/${projectCopy}`,
            data: dbText,
          },
          {
            path: `${PREVIEW_PROJECT_ROOT}/${rel}`,
            data: conflict,
          },
        ],
        { requestTimeoutMs: 120_000 },
      );
    }

    this.logger.warn(`sync conflict preserved for ${rel}`);
  }

  private setBaseline(
    session: SyncSession,
    rel: string,
    data: string | Uint8Array,
    binary: boolean,
  ): void {
    const bytes = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    session.baseline.set(rel, {
      hash: createHash('sha256').update(bytes).digest('hex'),
      size: bytes.byteLength,
      binary,
      text: typeof data === 'string' ? data : undefined,
    });
    session.suppressUntil = Date.now() + SYNC_SUPPRESS_MS;
  }

  private async readStoredBytes(
    storageKey: string | null,
  ): Promise<Uint8Array> {
    if (!storageKey) return new Uint8Array();
    try {
      return await this.storageService.downloadBytes(storageKey);
    } catch {
      return new Uint8Array();
    }
  }

  private async listSandboxFiles(
    sandboxId: string,
  ): Promise<SandboxManifestEntry[] | null> {
    const prune = [...SYNC_IGNORED_SEGMENTS]
      .map((segment) => `-path './${segment}'`)
      .join(' -o ');
    const command =
      `find . \\( ${prune} \\) -prune -o -type f ` +
      `-printf '%P\\t%s\\t%T@\\n'`;
    const result = await this.e2bService
      .runCommand(sandboxId, command, {
        cwd: PREVIEW_PROJECT_ROOT,
        timeoutMs: 60_000,
      })
      .catch(() => undefined);
    if (!result || result.exitCode !== 0) {
      this.logger.warn(`could not list sandbox files for ${sandboxId}`);
      return null;
    }

    const entries: SandboxManifestEntry[] = [];
    for (const line of result.stdout.split('\n')) {
      const [path, size, mtime] = line.split('\t');
      if (!path || !size || !mtime) continue;
      entries.push({
        path: this.normalizeSandboxPath(path) ?? path,
        size: Number(size),
        mtime: Number(mtime) * 1000,
      });
    }
    return entries;
  }

  private normalizeSandboxPath(raw: string): string | undefined {
    let value = raw.replace(/\\/g, '/').replace(/^\.\/+/, '');
    const prefix = `${PREVIEW_PROJECT_ROOT}/`;
    if (value.startsWith(prefix)) value = value.slice(prefix.length);
    if (!value || value.startsWith('/')) return undefined;
    const normalized = posix.normalize(value);
    if (
      !normalized ||
      normalized === '.' ||
      normalized === '..' ||
      normalized.startsWith('../') ||
      normalized.includes('/../')
    ) {
      return undefined;
    }
    return normalized;
  }

  private isIgnored(rel: string): boolean {
    return rel
      .split('/')
      .some((segment) => SYNC_IGNORED_SEGMENTS.has(segment));
  }

  private isBinaryBytes(bytes: Uint8Array): boolean {
    const sample = bytes.subarray(0, 8000);
    for (const byte of sample) {
      if (byte === 0) return true;
    }
    return false;
  }

  private contentTypeFor(rel: string, bytes: Uint8Array): string {
    const ext = posix.extname(rel).toLowerCase();
    const known: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    };
    if (known[ext]) return known[ext];
    return this.isBinaryBytes(bytes)
      ? 'application/octet-stream'
      : 'text/plain; charset=utf-8';
  }

  private isPreviewConfig(rel: string): boolean {
    return (
      rel === 'package.json' ||
      rel === 'lovable.conf' ||
      rel === '.env' ||
      rel.startsWith('.env.')
    );
  }

  private async restartPreviewForConfig(
    session: SyncSession,
  ): Promise<void> {
    const state = this.states.get(session.projectId);
    if (!state) return;
    state.signature = undefined;
    state.installed = false;
    await this.stopTrackedServer(session.sandboxId, state);
  }
  // ---------------------------------------------------------------- files ---

  private computeSignature(
    projectId: bigint,
    files: ProjectFile[],
    revision: number,
  ): string {
    const resolver = new ProjectPathResolver(projectId, files);
    const paths = files
      .filter((file) => file.type === 'file')
      .map((file) => resolver.pathOfId(file.id.toString()))
      .filter((path): path is string => Boolean(path))
      .sort();
    const meta = files
      .map(
        (file) =>
          `${file.id}:${file.type}:${file.version}:${file.updatedAt.getTime()}:${file.checksum ?? ''}:${file.size}:${file.isBinary ? 1 : 0}`,
      )
      .sort();
    return createHash('sha256')
      .update(`${revision}|${paths.join('|')}\n${meta.join('|')}`)
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
  ): Promise<SyncResult> {
    const revision = await this.projectRevision.get(projectId);
    const signature = this.computeSignature(projectId, files, revision);
    const marker = await this.readSyncMarker(sandboxId);

    if (marker?.signature === signature) {
      const baseline = new Map(Object.entries(marker.files));
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
          revision,
          baseline,
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
        revision,
        baseline,
      };
    }

    const { entries, baseline, packageHash, packageJson, lovableConf } =
      await this.collectFiles(projectId, files);

    // Normally the marker lists exactly which paths we wrote before, so
    // removals only cover paths that vanished from the database (protecting
    // sandbox-only files such as terminal output). A missing marker means a
    // freshly provisioned template sandbox — there the database is the only
    // source of truth, so every sandbox path the database does not know
    // about (e.g. template files the agent deleted) must be purged too,
    // otherwise the template resurrects on every sandbox expiry.
    let previous = marker?.files;
    if (!previous) {
      const manifest = await this.listSandboxFiles(sandboxId);
      previous = {};
      if (manifest) {
        for (const entry of manifest) {
          if (this.isIgnored(entry.path)) continue;
          if (baseline.has(entry.path)) continue;
          // Placeholder: materialize only reads the keys of `previous`.
          previous[entry.path] = { hash: '', size: entry.size, binary: false };
        }
      }
    }

    await this.materialize(sandboxId, entries, previous, baseline);
    await this.writeSyncMarker(sandboxId, {
      signature,
      revision,
      files: Object.fromEntries(baseline),
    });
    return {
      signature,
      changed: true,
      packageHash,
      packageJson,
      lovableConf,
      revision,
      baseline,
    };
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

  private async readSyncMarker(sandboxId: string): Promise<SyncMarker | null> {
    const raw = await this.readMarker(sandboxId, PREVIEW_SYNC_MARKER);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<SyncMarker>;
      if (
        typeof parsed.signature !== 'string' ||
        typeof parsed.revision !== 'number' ||
        !parsed.files ||
        typeof parsed.files !== 'object'
      ) {
        return null;
      }
      return parsed as SyncMarker;
    } catch {
      return null;
    }
  }

  private async writeSyncMarker(
    sandboxId: string,
    marker: SyncMarker,
  ): Promise<void> {
    const files = Object.fromEntries(
      Object.entries(marker.files).map(([path, file]) => [
        path,
        {
          hash: file.hash,
          size: file.size,
          mtime: file.mtime,
          binary: file.binary,
        },
      ]),
    );
    await this.writeMarker(
      sandboxId,
      PREVIEW_SYNC_MARKER,
      JSON.stringify({ ...marker, files }),
    );
  }

  private async collectFiles(
    projectId: bigint,
    files: ProjectFile[],
  ): Promise<{
    entries: Array<{ path: string; data: string | Uint8Array }>;
    baseline: Map<string, SyncBaseline>;
    packageHash: string;
    packageJson?: string;
    lovableConf?: string;
  }> {
    const resolver = new ProjectPathResolver(projectId, files);
    const entries: Array<{ path: string; data: string | Uint8Array }> = [];
    const baseline = new Map<string, SyncBaseline>();

    for (const file of files) {
      if (file.type !== 'file') continue;
      const rel = resolver.pathOfId(file.id.toString());
      if (!rel || rel.includes('..') || rel.startsWith('/')) continue;
      const path = `${PREVIEW_PROJECT_ROOT}/${rel}`;

      if (file.isBinary) {
        let data: Uint8Array = new Uint8Array();
        if (file.storageKey) {
          try {
            data = await this.storageService.downloadBytes(file.storageKey);
          } catch (err) {
            this.logger.warn(`could not read binary ${rel}: ${String(err)}`);
          }
        }
        entries.push({ path, data });
        baseline.set(rel, {
          hash: createHash('sha256').update(data).digest('hex'),
          size: data.byteLength,
          binary: true,
        });
        continue;
      }

      try {
        const { doc } = await this.documentState.getDocument(
          file.id.toString(),
        );
        entries.push({ path, data: doc });
        baseline.set(rel, {
          hash: createHash('sha256').update(doc).digest('hex'),
          size: Buffer.byteLength(doc, 'utf8'),
          binary: false,
          text: doc,
        });
      } catch (err) {
        this.logger.warn(`could not read file ${rel}: ${String(err)}`);
      }
    }

    const packageJson = baseline.get('package.json')?.text;
    const packageHash = createHash('sha256')
      .update(packageJson ?? '')
      .digest('hex');

    return {
      entries,
      baseline,
      packageHash,
      packageJson,
      lovableConf: baseline.get('lovable.conf')?.text,
    };
  }

  /**
   * Write the database tree into the sandbox. Only paths that were in the
   * previous baseline and disappeared from the database are removed, so
   * sandbox-only files (e.g. a terminal command's output) are never wiped.
   * The exception is a fresh template sandbox, where the caller passes the
   * live sandbox tree as `previous` so template leftovers get purged.
   */
  private async materialize(
    sandboxId: string,
    entries: Array<{ path: string; data: string | Uint8Array }>,
    previous: Record<string, SyncBaseline>,
    next: Map<string, SyncBaseline>,
  ): Promise<void> {
    await this.e2bService
      .runCommand(sandboxId, `mkdir -p ${PREVIEW_PROJECT_ROOT}`, {
        timeoutMs: 30_000,
      })
      .catch(() => undefined);

    const removed = Object.keys(previous).filter((path) => !next.has(path));
    for (let i = 0; i < removed.length; i += DELETE_BATCH_SIZE) {
      const batch = removed.slice(i, i + DELETE_BATCH_SIZE);
      await Promise.all(
        batch.map((path) =>
          this.e2bService
            .remove(sandboxId, `${PREVIEW_PROJECT_ROOT}/${path}`)
            .catch(() => undefined),
        ),
      );
    }

    for (let i = 0; i < entries.length; i += WRITE_BATCH_SIZE) {
      const batch = entries.slice(i, i + WRITE_BATCH_SIZE);
      await this.e2bService.writeFiles(sandboxId, batch, {
        requestTimeoutMs: 120_000,
      });
    }
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
      const hasModules = await this.e2bService.exists(
        sandboxId,
        `${PREVIEW_PROJECT_ROOT}/node_modules`,
      );
      if (!hasModules) return false;

      const marker = await this.e2bService.readFile(
        sandboxId,
        PREVIEW_INSTALL_MARKER,
      );
      if (marker.trim() === packageHash) return true;

      // The E2B template ships with `node_modules` already installed, but the
      // install marker lives under /tmp so it does not survive a fresh sandbox.
      // When the on-disk package.json still matches the project's, that install
      // is valid — adopt it instead of reinstalling (which would also kill the
      // dev server the template already started).
      const sandboxPackageJson = await this.e2bService
        .readFile(sandboxId, `${PREVIEW_PROJECT_ROOT}/package.json`)
        .catch(() => undefined);
      if (!sandboxPackageJson) return false;

      const sandboxHash = createHash('sha256')
        .update(sandboxPackageJson)
        .digest('hex');
      if (sandboxHash !== packageHash) return false;

      await this.writeInstallMarker(sandboxId, packageHash);
      this.logger.log(
        `Adopted the template install for sandbox ${sandboxId} (skipped pnpm install)`,
      );
      return true;
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

  private isTemplateStart(command: string | undefined): boolean {
    return Boolean(command?.includes(PREVIEW_TEMPLATE_START));
  }

  private async readTemplatePid(sandboxId: string): Promise<number | undefined> {
    const raw = await this.e2bService
      .readFile(sandboxId, PREVIEW_TEMPLATE_PID_PATH)
      .catch(() => '');
    const pid = Number(raw.trim());
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  }

  private async startDevServer(
    sandboxId: string,
    host: string,
    startCommand: string,
  ): Promise<number | undefined> {
    if (this.isTemplateStart(startCommand)) {
      const result = await this.e2bService.runCommand(
        sandboxId,
        `DEV_SERVER_PORT=${PREVIEW_DEV_PORT} ${startCommand}`,
        { cwd: PREVIEW_PROJECT_ROOT, timeoutMs: 60_000 },
      );
      if (result.exitCode !== 0) {
        const output = (result.stderr || result.stdout).slice(-2000);
        throw new Error(
          `Template dev server failed to start (exit ${result.exitCode}): ${output}`,
        );
      }
      const pid = await this.readTemplatePid(sandboxId);
      this.logger.log(
        `Started template dev server (pid ${pid ?? 'unknown'}) on port ${PREVIEW_DEV_PORT}`,
      );
      return pid;
    }

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
    if (state.stopCommand) {
      await this.e2bService
        .runCommand(sandboxId, state.stopCommand, {
          cwd: PREVIEW_PROJECT_ROOT,
          timeoutMs: 30_000,
        })
        .catch(() => undefined);
    } else if (state.pid != null) {
      await this.e2bService
        .killProcess(sandboxId, state.pid)
        .catch(() => undefined);
    }
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
    const templateRaw = raw.trim()
      ? ''
      : await this.e2bService
          .readFile(sandboxId, PREVIEW_TEMPLATE_LOG_PATH)
          .catch(() => '');
    const trimmed = (raw.trim() ? raw : templateRaw).trim();
    if (!trimmed) return '';
    const limit = Math.min(Math.max(lines, 1), 1000);
    return trimmed.split(/\r?\n/).slice(-limit).join('\n');
  }

  // --------------------------------------------------------------- health ---

  private async isHealthy(
    host: string,
    trafficToken?: string,
  ): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const res = await fetch(`https://${host}/`, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: trafficToken
          ? { 'e2b-traffic-access-token': trafficToken }
          : undefined,
      });
      // Anything below a gateway/server error means the dev server answered.
      return res.status < 500;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async waitForReady(
    sandboxId: string,
    host: string,
    trafficToken?: string,
    healthCommand?: string,
  ): Promise<boolean> {
    const deadline = Date.now() + PREVIEW_START_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (healthCommand) {
        const health = await this.e2bService
          .runCommand(sandboxId, healthCommand, {
            cwd: PREVIEW_PROJECT_ROOT,
            timeoutMs: 10_000,
          })
          .catch(() => undefined);
        if (health?.exitCode === 0) return true;
      }
      if (await this.isHealthy(host, trafficToken)) return true;
      await new Promise((resolve) => setTimeout(resolve, 1_500));
    }
    return false;
  }
}
