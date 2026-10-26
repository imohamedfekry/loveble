import { Injectable, Logger } from '@nestjs/common';

import { PREVIEW_PROJECT_ROOT } from 'src/Modules/preview/preview.constants';
import {
  PreviewLogService,
  type PreviewLogLine,
} from 'src/Modules/preview/preview-logs.service';
import { PreviewService } from 'src/Modules/preview/preview.service';
import { E2bService } from 'src/Modules/sandbox/e2b.service';

interface TerminalSession {
  /** Stable ownership key (user + project), independent of the socket id. */
  key: string;
  projectId: bigint;
  sandboxId: string;
  buffer: string;
  /** Recently emitted output, replayed when a socket resumes the session. */
  tail: string;
  escape?: string;
  queue: Promise<void>;
  stopping: boolean;
  /** A command is running: do not redraw the prompt on interjected output. */
  busy: boolean;
  detachTimer?: NodeJS.Timeout;
  /** Live site console subscription, kept across socket reconnects. */
  unsubscribeLogs?: () => void;
  onData: (chunk: string) => void;
  onExit: (exitCode?: number) => void;
}

export interface StartTerminalOptions {
  key: string;
  projectId: bigint;
  cols: number;
  rows: number;
  /** Force a brand-new session instead of resuming a live one. */
  fresh?: boolean;
  userName?: string;
  projectLabel?: string;
  onData: (chunk: string) => void;
  onExit: (exitCode?: number) => void;
}

const PROMPT = '\x1b[1;32mloveble\x1b[0m> ';
const MAX_OUTPUT_CHARS = 100_000;
const MAX_TAIL_CHARS = 8_000;
/** How long a disconnected session stays resumable before it is disposed. */
const SESSION_DETACH_TTL_MS = 10 * 60_000;
const EXEC_TIMEOUT_MS = 120_000;

const HELP = [
  'Available commands:',
  '  start          Start or refresh the preview server',
  '  stop           Stop the preview server',
  '  restart        Restart the preview server',
  '  health         Check the preview health',
  '  status         Show the preview status',
  '  logs [n]       Show the last n site console lines (default 40)',
  '  exec <command> Run a shell command in the project',
  '  clear          Clear the terminal',
  '  exit           Close this terminal session',
  '',
].join('\r\n');

function tail(text: string, limit = MAX_OUTPUT_CHARS): string {
  return text.length > limit ? text.slice(text.length - limit) : text;
}

/**
 * Format one captured line of the site console. Server lines keep the ANSI
 * colors the dev server wrote; browser lines come from the injected reporter.
 */
function formatPreviewLogLine(line: PreviewLogLine): string {
  const tag = line.source === 'browser' ? 'browser' : 'site';
  const tagColor = line.source === 'browser' ? '\x1b[35m' : '\x1b[36m';
  const body =
    line.level === 'error'
      ? `\x1b[31m${line.text}\x1b[39m`
      : line.level === 'warn'
        ? `\x1b[33m${line.text}\x1b[39m`
        : line.text;
  return `${tagColor}[${tag}]\x1b[0m ${body}`;
}

@Injectable()
export class TerminalService {
  private readonly logger = new Logger(TerminalService.name);
  private readonly sessions = new Map<string, TerminalSession>();
  /** Serializes start/stop per client so two starts cannot leak a session. */
  private readonly pending = new Map<string, Promise<unknown>>();

  constructor(
    private readonly e2bService: E2bService,
    private readonly previewService: PreviewService,
    private readonly previewLogs: PreviewLogService,
  ) {}

  start(options: StartTerminalOptions): Promise<{ pid: number; cwd: string }> {
    return this.enqueue(options.key, async () => {
      const existing = this.sessions.get(options.key);
      if (existing && !existing.stopping && !options.fresh) {
        // The session survived a socket drop (or a dock toggle): rebind the
        // output to the current socket and replay the recent tail so the
        // client catches up without re-running prepareSandbox.
        this.clearDetachTimer(existing);
        existing.onData = options.onData;
        existing.onExit = options.onExit;
        if (existing.tail) existing.onData(existing.tail);
        this.logger.log(`Terminal resumed for ${options.key}`);
        return { pid: 0, cwd: PREVIEW_PROJECT_ROOT };
      }

      await this.dispose(options.key); // no-op when nothing to throw away

      const { sandboxId } = await this.previewService.prepareSandbox(
        options.projectId,
      );
      const session: TerminalSession = {
        key: options.key,
        projectId: options.projectId,
        sandboxId,
        buffer: '',
        tail: '',
        queue: Promise.resolve(),
        stopping: false,
        busy: false,
        onData: options.onData,
        onExit: options.onExit,
      };
      this.sessions.set(options.key, session);
      this.logger.log(`Restricted terminal started for ${options.key}`);

      this.output(
        session,
        'Loveble project terminal\r\n' +
          'Type "help" to see the available commands.\r\n' +
          '\x1b[2mThe site console (dev server + browser errors) streams below.\x1b[0m\r\n\r\n',
      );
      this.prompt(session);
      this.attachPreviewLogs(session);

      return { pid: 0, cwd: PREVIEW_PROJECT_ROOT };
    });
  }

  write(key: string, data: string): void {
    const session = this.sessions.get(key);
    if (!session || session.stopping) return;
    for (const char of Array.from(data)) {
      this.handleInput(session, char);
    }
  }

  resize(_key: string, _cols: number, _rows: number): void {
    void _key;
    void _cols;
    void _rows;
    // The restricted command interface has no PTY to resize.
  }

  stop(key: string): Promise<void> {
    return this.enqueue(key, () => this.dispose(key));
  }

  /**
   * Keep a disconnected session alive for a short TTL so the same user can
   * resume it (new socket id, same user + project) instead of losing state.
   * Callers are disconnected sockets only; a live session is untouched.
   */
  detach(key: string): void {
    const session = this.sessions.get(key);
    if (!session || session.stopping) return;
    this.clearDetachTimer(session);
    session.detachTimer = setTimeout(() => {
      void this.stop(key).catch(() => undefined);
    }, SESSION_DETACH_TTL_MS);
    session.detachTimer.unref();
    this.logger.log(
      `Terminal detached for ${key} (resumable, TTL ${SESSION_DETACH_TTL_MS}ms)`,
    );
  }

  private clearDetachTimer(session: TerminalSession): void {
    if (session.detachTimer) {
      clearTimeout(session.detachTimer);
      session.detachTimer = undefined;
    }
  }

  private handleInput(session: TerminalSession, char: string): void {
    if (session.escape !== undefined) {
      if (session.escape === '\x1b') {
        session.escape = char === '[' ? '[' : undefined;
        return;
      }
      if (/[A-Za-z~]/.test(char)) session.escape = undefined;
      return;
    }

    if (char === '\x1b') {
      session.escape = '\x1b';
      return;
    }
    if (char === '\r' || char === '\n') {
      const line = session.buffer;
      session.buffer = '';
      this.output(session, '\r\n');
      this.submit(session, line);
      return;
    }
    if (char === '\x7f' || char === '\b') {
      if (session.buffer.length > 0) {
        session.buffer = session.buffer.slice(0, -1);
        this.output(session, '\b \b');
      }
      return;
    }
    if (char === '\x03') {
      session.buffer = '';
      this.output(session, '^C\r\n');
      this.prompt(session);
      return;
    }
    if (char === '\x0c') {
      this.output(session, '\x1b[2J\x1b[H');
      this.prompt(session);
      return;
    }
    if (char === '\t' || char < ' ') return;

    session.buffer += char;
    this.output(session, char);
  }

  private submit(session: TerminalSession, raw: string): void {
    const line = raw.trim();
    if (!line) {
      this.prompt(session);
      return;
    }

    const space = line.indexOf(' ');
    const command = (space === -1 ? line : line.slice(0, space)).toLowerCase();
    const args = space === -1 ? '' : line.slice(space + 1).trim();

    session.busy = true;
    session.queue = session.queue
      .then(() => this.runCommand(session, command, args))
      .catch((err) => {
        this.output(
          session,
          `\x1b[31m${err instanceof Error ? err.message : String(err)}\x1b[0m\r\n`,
        );
      })
      .finally(() => {
        session.busy = false;
        if (this.sessions.get(session.key) === session) {
          if (!session.stopping) this.prompt(session);
        }
      });
  }

  private async runCommand(
    session: TerminalSession,
    command: string,
    args: string,
  ): Promise<void> {
    switch (command) {
      case 'help':
      case '?':
        this.output(session, HELP);
        return;

      case 'start':
        this.output(session, 'Starting preview...\r\n');
        await this.previewService.ensure(session.projectId, { force: true });
        this.output(session, '\x1b[32mPreview is ready.\x1b[0m\r\n');
        return;

      case 'stop':
        this.output(session, 'Stopping preview...\r\n');
        await this.previewService.stop(session.projectId);
        this.output(session, 'Preview stopped.\r\n');
        return;

      case 'restart':
        this.output(session, 'Restarting preview...\r\n');
        await this.previewService.restart(session.projectId);
        this.output(session, '\x1b[32mPreview is ready.\x1b[0m\r\n');
        return;

      case 'health': {
        const health = await this.previewService.health(session.projectId);
        const color = health.ok ? '\x1b[32m' : '\x1b[31m';
        this.output(session, `${color}${health.message}\x1b[0m\r\n`);
        return;
      }

      case 'status': {
        const state = this.previewService.peek(session.projectId);
        this.output(
          session,
          `Preview: ${state?.status ?? 'stopped'}${
            state?.url ? ` (${state.url})` : ''
          }\r\n`,
        );
        return;
      }

      case 'logs': {
        const requested = Number.parseInt(args, 10);
        const limit = Number.isFinite(requested)
          ? Math.min(Math.max(requested, 1), 150)
          : 40;
        const lines = this.previewLogs.recent(session.projectId, limit);
        if (lines.length === 0) {
          this.output(session, 'No site console output captured yet.\r\n');
          return;
        }
        this.output(
          session,
          lines.map((line) => formatPreviewLogLine(line)).join('\r\n') + '\r\n',
        );
        return;
      }

      case 'clear':
        this.output(session, '\x1b[2J\x1b[H');
        return;

      case 'exec':
        await this.exec(session, args);
        return;

      case 'exit':
      case 'quit':
        this.output(session, 'Closing terminal...\r\n');
        await this.exit(session);
        return;

      default:
        this.output(
          session,
          `\x1b[31mUnknown command: ${command}\x1b[0m\r\n` +
            'Type "help" to see the available commands.\r\n',
        );
    }
  }

  private async exec(session: TerminalSession, command: string): Promise<void> {
    if (!command) {
      this.output(session, 'Usage: exec <command>\r\n');
      return;
    }

    const { sandboxId } = await this.previewService.prepareSandbox(
      session.projectId,
    );
    if (sandboxId !== session.sandboxId) {
      session.sandboxId = sandboxId;
      this.detachPreviewLogs(session);
      this.attachPreviewLogs(session);
    }
    const result = await this.e2bService.runCommand(sandboxId, command, {
      cwd: PREVIEW_PROJECT_ROOT,
      timeoutMs: EXEC_TIMEOUT_MS,
    });
    await this.previewService.flush(session.projectId).catch(() => undefined);

    if (result.stdout) this.output(session, tail(result.stdout));
    if (result.stderr) {
      this.output(session, `\x1b[31m${tail(result.stderr)}\x1b[0m`);
    }
    if (
      (result.stdout && !result.stdout.endsWith('\n')) ||
      (result.stderr && !result.stderr.endsWith('\n'))
    ) {
      this.output(session, '\r\n');
    }
    if (result.exitCode !== 0) {
      this.output(
        session,
        `\x1b[31mCommand exited with code ${result.exitCode}.\x1b[0m\r\n`,
      );
    }
  }

  private async exit(session: TerminalSession): Promise<void> {
    session.stopping = true;
    this.clearDetachTimer(session);
    this.detachPreviewLogs(session);
    this.sessions.delete(session.key);
    await this.previewService.flush(session.projectId).catch(() => undefined);
    session.onExit(0);
  }

  private async dispose(key: string): Promise<void> {
    const session = this.sessions.get(key);
    if (!session) return;

    this.clearDetachTimer(session);
    session.stopping = true;
    this.detachPreviewLogs(session);
    this.sessions.delete(key);
    await this.previewService
      .flush(session.projectId)
      .catch((err) =>
        this.logger.warn(`sandbox flush failed for ${key}: ${String(err)}`),
      );
    this.logger.log(`Restricted terminal stopped for ${key}`);
  }

  private output(session: TerminalSession, chunk: string): void {
    if (session.stopping) return;
    if (session.tail.length + chunk.length > MAX_TAIL_CHARS) {
      session.tail = tail(session.tail + chunk, MAX_TAIL_CHARS);
    } else {
      session.tail += chunk;
    }
    session.onData(chunk);
  }

  private prompt(session: TerminalSession): void {
    this.output(session, PROMPT);
  }

  /** Mirror the project's live site console into this terminal session. */
  private attachPreviewLogs(session: TerminalSession): void {
    if (session.unsubscribeLogs) return;
    session.unsubscribeLogs = this.previewLogs.subscribe(
      session.projectId,
      session.sandboxId,
      (line) => this.interject(session, formatPreviewLogLine(line)),
    );
  }

  private detachPreviewLogs(session: TerminalSession): void {
    session.unsubscribeLogs?.();
    session.unsubscribeLogs = undefined;
  }

  /**
   * Print a line that arrives while the user may be typing. The line is
   * written above the prompt, then the prompt and the half-typed command are
   * restored — otherwise streaming logs would corrupt the current input.
   */
  private interject(session: TerminalSession, text: string): void {
    if (session.stopping) return;

    if (session.busy) {
      this.output(session, `\r\n${text}\r\n`);
      return;
    }

    this.output(session, '\r\x1b[2K');
    this.output(session, text + '\r\n');
    this.output(session, PROMPT + session.buffer);
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
