import {
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { FilesystemEvent, WatchHandle } from 'e2b';
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

import { PREVIEW_PROJECT_ROOT, PREVIEW_SYNC_MARKER } from './preview.constants';

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
  revision: number;
  baseline: Map<string, SyncBaseline>;
}

/**
 * Keeps the project's database tree and its E2B sandbox in sync (both ways).
 *
 * This service knows nothing about the preview server: it only materializes
 * files, watches the sandbox for edits and imports them back. Dev-server
 * lifecycle lives in `dev-server.sh` (template) and `PreviewService.wake`.
 */
@Injectable()
export class WorkspaceSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkspaceSyncService.name);
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

  /**
   * Materialize the latest project files into the sandbox. Used by the
   * preview wake-up and by the agent's `terminal` tool so builds/tests see the
   * same files the preview serves.
   */
  async prepareSandbox(
    projectId: bigint,
  ): Promise<{ sandboxId: string; root: string }> {
    const { sandboxId } = await this.ensureSandbox(projectId);
    await this.attach(projectId, sandboxId);
    const files = await this.fileRepository.getAllFilesWithProjectId(projectId);
    const synced = await this.syncFiles(projectId, sandboxId, files);
    this.updateSessionFromSync(projectId, sandboxId, synced);
    return { sandboxId, root: PREVIEW_PROJECT_ROOT };
  }

  /**
   * Resolve (or provision) the sandbox that backs a project.
   *
   * Single-flighted per project: the project page (openProject), the preview
   * wake-up and the first build agent can all ask for a sandbox at the same
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

  // --------------------------------------------------------------- attach ---

  async attach(projectId: bigint, sandboxId: string): Promise<void> {
    const key = projectId.toString();

    // Serialize attaches per project. The project page (openProject), the
    // preview wake-up and the build agent can all prepare the same sandbox at
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
      // from the scaffold instead of an empty project.
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

    try {
      const files =
        await this.fileRepository.getAllFilesWithProjectId(projectId);
      const synced = await this.syncFiles(projectId, sandboxId, files);
      this.updateSessionFromSync(projectId, sandboxId, synced);
    } catch (err) {
      this.logger.warn(`initial sync failed for ${key}: ${String(err)}`);
    }

    await this.startWatcher(session);

    void this.e2bService.extend(sandboxId).catch(() => undefined);
    session.keepAliveTimer = setInterval(() => {
      void this.e2bService.extend(sandboxId).catch((err) => {
        this.logger.warn(`sandbox keepalive failed for ${key}: ${String(err)}`);
      });
    }, SANDBOX_KEEPALIVE_MS);
    session.keepAliveTimer.unref();
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

  // -------------------------------------------------------------- watcher ---

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
      const synced = await this.syncFiles(projectId, ensured.sandboxId, files);
      this.updateSessionFromSync(projectId, ensured.sandboxId, synced);

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

  // ----------------------------------------------------- push (DB -> box) ---

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
    try {
      if (session.pendingTree) {
        const files =
          await this.fileRepository.getAllFilesWithProjectId(projectId);
        const synced = await this.syncFiles(
          projectId,
          session.sandboxId,
          files,
        );
        this.updateSessionFromSync(projectId, session.sandboxId, synced);
        session.pendingTree = false;
        session.pendingFileIds.clear();
      } else {
        const ids = [...session.pendingFileIds];
        session.pendingFileIds.clear();
        for (const fileId of ids) {
          await this.pushFileToSandbox(session, fileId);
        }
        await this.refreshSyncMarker(session);
      }
      session.lastRevision = await this.projectRevision.get(projectId);
    } catch (err) {
      this.logger.warn(`push to sandbox failed for ${key}: ${String(err)}`);
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
    const files = await this.fileRepository.getAllFilesWithProjectId(projectId);
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
    const files = await this.fileRepository.getAllFilesWithProjectId(projectId);
    const revision = await this.projectRevision.get(projectId);
    const signature = this.computeSignature(projectId, files, revision);
    await this.writeSyncMarker(session.sandboxId, {
      signature,
      revision,
      files: Object.fromEntries(session.baseline),
    });
    session.lastRevision = revision;
  }

  // ---------------------------------------------------- import (box -> DB) ---

  private async flushImport(projectId: bigint): Promise<void> {
    const key = projectId.toString();
    const session = this.syncSessions.get(key);
    if (!session) return;
    if (session.applying) {
      this.scheduleImport(key);
      return;
    }
    if (!session.pendingImportTree && session.pendingPaths.size === 0) {
      return;
    }

    session.applying = true;
    try {
      if (session.pendingImportTree) {
        session.pendingImportTree = false;
        session.pendingPaths.clear();
        await this.importSandboxChanges(session, false);
      } else {
        const paths = [...session.pendingPaths];
        session.pendingPaths.clear();
        for (const rel of paths) {
          await this.importSandboxPath(session, rel);
        }
      }
      const files =
        await this.fileRepository.getAllFilesWithProjectId(projectId);
      const synced = await this.syncFiles(projectId, session.sandboxId, files);
      this.updateSessionFromSync(projectId, session.sandboxId, synced);
    } catch (err) {
      this.logger.warn(`import from sandbox failed for ${key}: ${String(err)}`);
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
    const files = await this.fileRepository.getAllFilesWithProjectId(projectId);
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
    const files = await this.fileRepository.getAllFilesWithProjectId(projectId);
    const resolver = new ProjectPathResolver(projectId, files);
    const node = resolver.resolve(rel);
    const sandboxHash = createHash('sha256').update(bytes).digest('hex');

    if (!node) {
      await this.writeSandboxFile(session, rel, bytes, binary, contentType);
      return true;
    }
    if (node.type !== 'file') return false;
    if (node.isBinary !== binary) {
      await this.handleConflict(session, rel, node, bytes, binary, contentType);
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
      await this.handleConflict(session, rel, node, bytes, binary, contentType);
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
    const files = await this.fileRepository.getAllFilesWithProjectId(projectId);
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
      const dbText = (await this.documentState.getDocument(node.id.toString()))
        .doc;
      const sandboxText = Buffer.from(sandboxBytes).toString('utf8');
      await this.projectMutations.writeFile(projectId, projectCopy, dbText);
      this.setBaseline(
        session,
        projectCopy,
        Buffer.from(dbText, 'utf8'),
        false,
      );
      const conflict = `<<<<<<< project\n${dbText}\n=======\n${sandboxText}\n>>>>>>> sandbox\n`;
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

  // -------------------------------------------------------------- helpers ---

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
    return rel.split('/').some((segment) => SYNC_IGNORED_SEGMENTS.has(segment));
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
    files: ProjectFile[],
  ): Promise<SyncResult> {
    const revision = await this.projectRevision.get(projectId);
    const signature = this.computeSignature(projectId, files, revision);
    const marker = await this.readSyncMarker(sandboxId);

    if (marker?.signature === signature) {
      return {
        signature,
        changed: false,
        revision,
        baseline: new Map(Object.entries(marker.files)),
      };
    }

    const { entries, baseline } = await this.collectFiles(projectId, files);

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
    return { signature, changed: true, revision, baseline };
  }

  private async readSyncMarker(sandboxId: string): Promise<SyncMarker | null> {
    const raw = await this.e2bService
      .readFile(sandboxId, PREVIEW_SYNC_MARKER)
      .catch(() => '');
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
    await this.e2bService
      .writeFiles(sandboxId, [
        {
          path: PREVIEW_SYNC_MARKER,
          data: JSON.stringify({ ...marker, files }),
        },
      ])
      .catch(() => undefined);
  }

  private async collectFiles(
    projectId: bigint,
    files: ProjectFile[],
  ): Promise<{
    entries: Array<{ path: string; data: string | Uint8Array }>;
    baseline: Map<string, SyncBaseline>;
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

    return { entries, baseline };
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
}
