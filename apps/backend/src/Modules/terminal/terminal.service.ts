import { Injectable, Logger } from '@nestjs/common';

import { PREVIEW_PROJECT_ROOT } from 'src/Modules/preview/preview.constants';
import { PreviewService } from 'src/Modules/preview/preview.service';
import { E2bService, type PtyHandle } from 'src/Modules/sandbox/e2b.service';

interface TerminalSession {
  pty: PtyHandle;
  decoder: TextDecoder;
  encoder: TextEncoder;
  queue: Promise<void>;
  stopping: boolean;
}

export interface StartTerminalOptions {
  key: string;
  projectId: bigint;
  cols: number;
  rows: number;
  userName?: string;
  projectLabel?: string;
  onData: (chunk: string) => void;
  onExit: (exitCode?: number) => void;
}

/**
 * Project names are user/AI controlled, and bash expands `$()`/backticks in
 * PS1 on every prompt. Keep the label to plain text so the prompt can never
 * run a command or eat prompt escapes.
 */
function promptLabel(value: string | undefined, fallback: string): string {
  const cleaned = (value ?? '')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32);
  return cleaned || fallback;
}

function shellInit(user: string, project: string): string {
  const prompt = String.raw`\[\e[1;32m\]${user}\[\e[0m\]@\[\e[1;36m\]${project}\[\e[0m\] \[\e[34m\]\w\[\e[0m\] \$ `;
  // Clear the screen so the setup line and the default prompt never show up,
  // then drop the setup line itself from the shell history.
  return String.raw`export PS1='${prompt}'; printf '\033[2J\033[H'; history -c`;
}

@Injectable()
export class TerminalService {
  private readonly logger = new Logger(TerminalService.name);
  private readonly sessions = new Map<string, TerminalSession>();
  /** Serializes start/stop per client so two starts cannot leak a PTY. */
  private readonly pending = new Map<string, Promise<unknown>>();

  constructor(
    private readonly e2bService: E2bService,
    private readonly previewService: PreviewService,
  ) {}

  start(options: StartTerminalOptions): Promise<{ pid: number; cwd: string }> {
    return this.enqueue(options.key, async () => {
      await this.dispose(options.key);

      const { sandboxId } = await this.previewService.prepareSandbox(
        options.projectId,
      );
      const decoder = new TextDecoder();

      const pty = await this.e2bService.createPty(sandboxId, {
        cols: options.cols,
        rows: options.rows,
        cwd: PREVIEW_PROJECT_ROOT,
        timeoutMs: 0,
        onData: (data) =>
          options.onData(decoder.decode(data, { stream: true })),
      });

      const session: TerminalSession = {
        pty,
        decoder,
        encoder: new TextEncoder(),
        queue: Promise.resolve(),
        stopping: false,
      };
      this.sessions.set(options.key, session);
      this.logger.log(
        `PTY ${pty.pid} started for ${options.key} (${options.cols}x${options.rows})`,
      );

      const user = promptLabel(options.userName, 'user');
      const project = promptLabel(options.projectLabel, 'project');
      await pty
        .sendInput(session.encoder.encode(`${shellInit(user, project)}\n`))
        .catch((err) =>
          this.logger.warn(
            `PTY prompt setup failed for ${options.key}: ${String(err)}`,
          ),
        );

      void pty
        .wait()
        .then(({ exitCode }) => {
          if (!session.stopping && this.sessions.get(options.key) === session) {
            options.onExit(exitCode);
          }
        })
        .catch(() => {
          if (!session.stopping && this.sessions.get(options.key) === session) {
            options.onExit(undefined);
          }
        })
        .finally(() => {
          if (this.sessions.get(options.key) === session) {
            this.sessions.delete(options.key);
          }
        });

      return { pid: pty.pid, cwd: PREVIEW_PROJECT_ROOT };
    });
  }

  write(key: string, data: string): void {
    const session = this.sessions.get(key);
    if (!session) return;

    session.queue = session.queue
      .then(() => session.pty.sendInput(session.encoder.encode(data)))
      .catch((err) =>
        this.logger.warn(`PTY input failed for ${key}: ${String(err)}`),
      );
  }

  async resize(key: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(key);
    if (!session) return;
    await session.pty
      .resize(cols, rows)
      .catch((err) =>
        this.logger.warn(`PTY resize failed for ${key}: ${String(err)}`),
      );
  }

  stop(key: string): Promise<void> {
    return this.enqueue(key, () => this.dispose(key));
  }

  private async dispose(key: string): Promise<void> {
    const session = this.sessions.get(key);
    if (!session) return;

    this.sessions.delete(key);
    session.stopping = true;
    await session.pty.disconnect().catch(() => undefined);
    await session.pty.kill().catch(() => undefined);
    this.logger.log(`PTY ${session.pty.pid} stopped for ${key}`);
  }

  private enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.pending.get(key) ?? Promise.resolve();
    const next = previous.then(task, task);
    const tracked = next.catch(() => undefined);
    this.pending.set(key, tracked);
    void tracked.finally(() => {
      if (this.pending.get(key) === tracked) this.pending.delete(key);
    });
    return next;
  }
}
