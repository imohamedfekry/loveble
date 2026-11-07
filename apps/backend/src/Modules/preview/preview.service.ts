import { Injectable, Logger } from '@nestjs/common';

import { E2bService } from 'src/Modules/sandbox/e2b.service';
import type { EnsureResult } from 'src/Modules/sandbox/sandbox.service';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';

import {
  PREVIEW_DEV_PORT,
  PREVIEW_LOG_PATH,
  PREVIEW_PROJECT_ROOT,
  PREVIEW_START_TIMEOUT_MS,
  PREVIEW_TEMPLATE_LOG_PATH,
  PREVIEW_TEMPLATE_START,
  previewPublicUrl,
} from './preview.constants';
import { WorkspaceSyncService } from './workspace-sync.service';

export interface PreviewTarget {
  sandboxId: string;
  /** Sandbox public hostname for the dev-server port. */
  host: string;
  /** Server-side token required by the sandbox gateway. Never send to clients. */
  trafficToken?: string;
}

export type PreviewStatus =
  | 'stopped'
  | 'installing'
  | 'starting'
  | 'ready'
  | 'error';

/** Shape older callers (agent tools, terminal) still read. */
export interface PreviewState {
  status: PreviewStatus;
  url?: string;
  host?: string;
  /** Server-side token required by the sandbox proxy. Never send to clients. */
  trafficToken?: string;
  error?: string;
}

export interface PreviewStatusResult {
  status: PreviewStatus;
  url?: string;
  error?: string;
}

/** How long a resolved target is reused before asking the DB / E2B again. */
const TARGET_TTL_MS = 15_000;
const HEALTH_TIMEOUT_MS = 3_000;

/**
 * The preview is a tunnel: the proxy authorizes the caller, asks
 * {@link resolve} where the sandbox is, and streams traffic through.
 *
 * Everything else (files, install, dev-server boot) is either owned by
 * {@link WorkspaceSyncService} or by `dev-server.sh` inside the template.
 * The only lifecycle logic left here is {@link wake}, which runs when the
 * tunnel finds nothing listening on the preview port.
 */
@Injectable()
export class PreviewService {
  private readonly logger = new Logger(PreviewService.name);
  private readonly targets = new Map<string, PreviewTarget & { at: number }>();
  private readonly waking = new Map<string, Promise<void>>();
  private readonly errors = new Map<string, string>();

  constructor(
    private readonly e2b: E2bService,
    private readonly projects: ProjectRepository,
    private readonly workspace: WorkspaceSyncService,
  ) {}

  /**
   * Where this project's traffic goes. Never provisions a sandbox (it may
   * resume a paused one, which is what E2B's connect does). Returns undefined
   * when the project has no sandbox or the sandbox no longer exists.
   */
  async resolve(projectId: bigint): Promise<PreviewTarget | undefined> {
    const key = projectId.toString();
    const hit = this.targets.get(key);
    if (hit && Date.now() - hit.at < TARGET_TTL_MS) return hit;

    const project = await this.projects.findById(projectId);
    const sandboxId = project?.sandboxId;
    if (!sandboxId) {
      this.targets.delete(key);
      return undefined;
    }

    try {
      const host = await this.e2b.getHost(sandboxId, PREVIEW_DEV_PORT);
      const target = {
        sandboxId,
        host,
        trafficToken: this.e2b.trafficToken(sandboxId),
        at: Date.now(),
      };
      this.targets.set(key, target);
      return target;
    } catch {
      this.targets.delete(key);
      return undefined;
    }
  }

  /** Drop the cached target (call after a sandbox swap if you need it now). */
  forget(projectId: bigint): void {
    this.targets.delete(projectId.toString());
  }

  /**
   * Make sure sandbox + files + dev server exist. Single-flight per project:
   * concurrent callers (proxy, status polling, agent) share one run.
   */
  wake(projectId: bigint): Promise<void> {
    const key = projectId.toString();
    const running = this.waking.get(key);
    if (running) return running;

    const task = this.wakeInner(projectId, key).finally(() => {
      if (this.waking.get(key) === task) this.waking.delete(key);
    });
    this.waking.set(key, task);
    return task;
  }

  private async wakeInner(projectId: bigint, key: string): Promise<void> {
    try {
      const { sandboxId } = await this.workspace.prepareSandbox(projectId);
      this.targets.delete(key);

      const target = await this.resolve(projectId);
      if (!target) throw new Error('Sandbox unavailable');

      if (!(await this.isHealthy(target))) {
        const result = await this.e2b.runCommand(
          sandboxId,
          `DEV_SERVER_PORT=${PREVIEW_DEV_PORT} bash ${PREVIEW_TEMPLATE_START} start`,
          { cwd: PREVIEW_PROJECT_ROOT, timeoutMs: 60_000 },
        );
        if (result.exitCode !== 0) {
          const output = (result.stderr || result.stdout).slice(-1500);
          throw new Error(
            `Dev server failed to start (exit ${result.exitCode}): ${output}`,
          );
        }

        const deadline = Date.now() + PREVIEW_START_TIMEOUT_MS;
        while (Date.now() < deadline && !(await this.isHealthy(target))) {
          await new Promise((resolve) => setTimeout(resolve, 1_500));
        }
        if (!(await this.isHealthy(target))) {
          const logs = await this.readLogTail(sandboxId, 30);
          throw new Error(
            `Preview server did not become ready.${logs ? `\n${logs}` : ''}`,
          );
        }
      }

      this.errors.delete(key);
      this.logger.log(`Preview ready for project ${key}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.errors.set(key, message);
      this.logger.error(`Preview wake failed for project ${key}: ${message}`);
      throw err;
    }
  }

  /**
   * Status for the UI. Never blocks on provisioning: when the preview is not
   * serving it kicks {@link wake} in the background and reports what it knows.
   */
  async status(projectId: bigint): Promise<PreviewStatusResult> {
    const key = projectId.toString();
    const target = await this.resolve(projectId);
    if (target && (await this.isHealthy(target))) {
      this.errors.delete(key);
      return { status: 'ready', url: previewPublicUrl(key) };
    }

    void this.wake(projectId).catch(() => undefined);
    const error = this.errors.get(key);
    return { status: error ? 'error' : 'starting', error };
  }

  async restart(projectId: bigint): Promise<void> {
    await this.stop(projectId);
    await this.wake(projectId);
  }

  /** Stop the dev server (the sandbox and the file sync keep running). */
  async stop(projectId: bigint): Promise<void> {
    const target = await this.resolve(projectId);
    if (target) {
      await this.e2b
        .runCommand(target.sandboxId, `bash ${PREVIEW_TEMPLATE_START} stop`, {
          cwd: PREVIEW_PROJECT_ROOT,
          timeoutMs: 30_000,
        })
        .catch(() => undefined);
    }
    this.targets.delete(projectId.toString());
  }

  // ---------------------------------------------------------- compat layer ---
  // Older callers (agent tools, terminal, project service) still use these
  // names. They only delegate; migrate callers to `wake` / `resolve` /
  // `WorkspaceSyncService` and delete this section when convenient.

  /** @deprecated use `wake` (or `restart` for force). */
  async ensure(
    projectId: bigint,
    options?: { force?: boolean },
  ): Promise<PreviewState> {
    if (options?.force) await this.restart(projectId);
    else await this.wake(projectId);
    return this.peek(projectId) ?? { status: 'ready' };
  }

  /** @deprecated cached state only; use `status` or `resolve`. */
  peek(projectId: bigint): PreviewState | undefined {
    const key = projectId.toString();
    const target = this.targets.get(key);
    const error = this.errors.get(key);
    const waking = this.waking.has(key);
    if (!target && !error && !waking) return undefined;

    const status: PreviewStatus = error
      ? 'error'
      : waking || !target
        ? 'starting'
        : 'ready';
    return {
      status,
      url: status === 'ready' ? previewPublicUrl(key) : undefined,
      host: target?.host,
      trafficToken: target?.trafficToken,
      error,
    };
  }

  /** @deprecated moved to WorkspaceSyncService. */
  prepareSandbox(
    projectId: bigint,
  ): Promise<{ sandboxId: string; root: string }> {
    return this.workspace.prepareSandbox(projectId);
  }

  /** @deprecated moved to WorkspaceSyncService. */
  flush(projectId: bigint): Promise<void> {
    return this.workspace.flush(projectId);
  }

  /** @deprecated moved to WorkspaceSyncService. */
  detach(projectId: bigint): Promise<void> {
    return this.workspace.detach(projectId);
  }

  /** @deprecated moved to WorkspaceSyncService. */
  attach(projectId: bigint, sandboxId: string): Promise<void> {
    return this.workspace.attach(projectId, sandboxId);
  }

  /** @deprecated moved to WorkspaceSyncService. */
  ensureSandbox(projectId: bigint): Promise<EnsureResult> {
    return this.workspace.ensureSandbox(projectId);
  }

  async health(projectId: bigint): Promise<{ ok: boolean; message: string }> {
    const target = await this.resolve(projectId);
    const ok = target ? await this.isHealthy(target) : false;
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
    const key = projectId.toString();
    const target = await this.resolve(projectId);
    const logs = target ? await this.readLogTail(target.sandboxId, lines) : '';
    return {
      logs,
      status: this.peek(projectId)?.status,
      error: this.errors.get(key),
    };
  }

  async isHealthy(target: PreviewTarget): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    try {
      const res = await fetch(`https://${target.host}/`, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: target.trafficToken
          ? { 'e2b-traffic-access-token': target.trafficToken }
          : undefined,
      });
      void res.body?.cancel().catch(() => undefined);
      // The E2B gateway answers 502 when nothing listens on the port.
      return res.status < 500;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  private async readLogTail(sandboxId: string, lines: number): Promise<string> {
    const read = (path: string) =>
      this.e2b.readFile(sandboxId, path).catch(() => '');
    const primary = (await read(PREVIEW_LOG_PATH)).trim();
    const raw = primary || (await read(PREVIEW_TEMPLATE_LOG_PATH)).trim();
    if (!raw) return '';
    const limit = Math.min(Math.max(lines, 1), 1000);
    return raw.split(/\r?\n/).slice(-limit).join('\n');
  }
}
