import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';

import {
  E2bService,
  type StreamingCommand,
} from 'src/Modules/sandbox/e2b.service';

import {
  PREVIEW_LOG_PATH,
  PREVIEW_TEMPLATE_LOG_PATH,
} from './preview.constants';

export type PreviewLogSource = 'server' | 'browser';
export type PreviewLogLevel = 'info' | 'warn' | 'error';

export interface PreviewLogLine {
  source: PreviewLogSource;
  level: PreviewLogLevel;
  /** Single log line (server lines keep their ANSI colors). */
  text: string;
  at: number;
}

/** One entry of the reporter payload posted by the preview iframe. */
export interface BrowserConsoleEvent {
  level?: unknown;
  message?: unknown;
  url?: unknown;
  at?: unknown;
}

interface LogFollower {
  key: string;
  projectId: bigint;
  sandboxId: string;
  command?: StreamingCommand;
  /** Partial line waiting for its newline. */
  pending: string;
  /** True once the initial backlog has been streamed. */
  started: boolean;
  stopping: boolean;
  failures: number;
  restartTimer?: NodeJS.Timeout;
}

const MAX_HISTORY = 150;
const HISTORY_TTL_MS = 15 * 60_000;
const MAX_LINE_CHARS = 2_000;
/** Lines replayed when the follower starts, so opening the terminal is useful. */
const TAIL_START_LINES = 30;
const TAIL_TIMEOUT_MS = 60 * 60_000;
const RESTART_BASE_DELAY_MS = 2_000;
const MAX_RESTART_DELAY_MS = 30_000;
const BROWSER_EVENTS_PER_MINUTE = 120;
const MAX_BROWSER_EVENTS_PER_REQUEST = 25;
const DUPLICATE_WINDOW_MS = 2_000;
// eslint-disable-next-line no-control-regex -- matching the ESC byte is the point
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;

/** Both log files are followed; only one of them exists for a given project. */
const TAIL_SOURCES = `${PREVIEW_LOG_PATH} ${PREVIEW_TEMPLATE_LOG_PATH}`;

const ERROR_HINTS =
  /(\berror\b|\berr!|\bfailed\b|\bfailure\b|\bexception\b|unhandled|cannot find|enoent|internal server error|✘|✖)/i;
const WARN_HINTS = /(\bwarn(ing)?\b|deprecated|⚠)/i;

function classify(text: string): PreviewLogLevel {
  const plain = text.replace(ANSI, '');
  if (ERROR_HINTS.test(plain)) return 'error';
  if (WARN_HINTS.test(plain)) return 'warn';
  return 'info';
}

/**
 * Live view of what the running website prints.
 *
 * Two sources feed it, both scoped to a project:
 * - the sandbox dev-server log (Vite + SSR output: build errors, server
 *   exceptions, `console.*` from server-rendered code), followed with a
 *   long-lived `tail -F` inside the sandbox;
 * - browser events forwarded by the preview proxy (uncaught errors, unhandled
 *   rejections, `console.error` / `console.warn` from the iframe).
 *
 * Terminal sessions subscribe to it, so the panel shows the site's real
 * console instead of only the agent shell.
 */
@Injectable()
export class PreviewLogService implements OnModuleDestroy {
  private readonly logger = new Logger(PreviewLogService.name);
  private readonly listeners = new Map<
    string,
    Set<(line: PreviewLogLine) => void>
  >();
  private readonly history = new Map<string, PreviewLogLine[]>();
  private readonly followers = new Map<string, LogFollower>();
  private readonly browserBudget = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(private readonly e2bService: E2bService) {}

  /**
   * Start (or reuse) the live log stream for a project and receive its lines.
   * The returned function stops this subscription; the underlying `tail`
   * process is stopped once the last subscriber is gone.
   */
  subscribe(
    projectId: bigint,
    sandboxId: string,
    onLine: (line: PreviewLogLine) => void,
  ): () => void {
    const key = projectId.toString();
    let listeners = this.listeners.get(key);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(key, listeners);
    }
    listeners.add(onLine);

    for (const line of this.recent(projectId)) {
      try {
        onLine(line);
      } catch {
        // A dying socket must not break the replay.
      }
    }

    void this.ensureFollower(projectId, sandboxId).catch((err) =>
      this.logger.warn(
        `preview log follower failed for project ${key}: ${String(err)}`,
      ),
    );

    return () => {
      const current = this.listeners.get(key);
      if (!current) return;
      current.delete(onLine);
      if (current.size > 0) return;
      this.listeners.delete(key);
      void this.stopFollower(key);
    };
  }

  /** Recently captured lines (newest last), used for replays and `logs`. */
  recent(projectId: bigint, limit = MAX_HISTORY): PreviewLogLine[] {
    const key = projectId.toString();
    const lines = this.history.get(key);
    if (!lines) return [];
    const cutoff = Date.now() - HISTORY_TTL_MS;
    const fresh = lines.filter((line) => line.at >= cutoff);
    if (fresh.length !== lines.length) this.history.set(key, fresh);
    return fresh.slice(-Math.min(Math.max(limit, 1), MAX_HISTORY));
  }

  /**
   * Record browser-side console output sent by the reporter injected into the
   * preview iframe. Payloads are untrusted: everything is bounded here.
   */
  pushBrowserEvents(projectId: bigint, raw: unknown): void {
    const key = projectId.toString();
    const events: unknown[] = Array.isArray(raw)
      ? raw.slice(0, MAX_BROWSER_EVENTS_PER_REQUEST)
      : [];
    if (events.length === 0) return;

    for (const entry of events) {
      if (!entry || typeof entry !== 'object') continue;
      if (!this.takeBrowserBudget(key)) return;

      const event = entry as BrowserConsoleEvent;
      const message =
        typeof event.message === 'string' ? event.message.trim() : '';
      if (!message) continue;

      const url = typeof event.url === 'string' ? event.url.trim() : '';
      const level: PreviewLogLevel =
        event.level === 'error'
          ? 'error'
          : event.level === 'warn'
            ? 'warn'
            : 'info';
      const text = (url ? `${message}  (${url})` : message).slice(
        0,
        MAX_LINE_CHARS,
      );

      this.emit(key, {
        source: 'browser',
        level,
        text,
        at: Date.now(),
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      Array.from(this.followers.keys()).map((key) => this.stopFollower(key)),
    );
  }

  // -------------------------------------------------------------- internals ---

  private emit(key: string, line: PreviewLogLine): void {
    const history = this.history.get(key) ?? [];
    const last = history[history.length - 1];
    if (
      last &&
      last.source === line.source &&
      last.text === line.text &&
      line.at - last.at < DUPLICATE_WINDOW_MS
    ) {
      return;
    }

    history.push(line);
    if (history.length > MAX_HISTORY) {
      history.splice(0, history.length - MAX_HISTORY);
    }
    this.history.set(key, history);

    for (const listener of this.listeners.get(key) ?? []) {
      try {
        listener(line);
      } catch {
        // One broken subscriber must not stop the others.
      }
    }
  }

  /** Whether a still-fresh server log line is already in the history. */
  private hasServerHistory(key: string): boolean {
    const cutoff = Date.now() - HISTORY_TTL_MS;
    return (this.history.get(key) ?? []).some(
      (line) => line.source === 'server' && line.at >= cutoff,
    );
  }

  private takeBrowserBudget(key: string): boolean {
    const now = Date.now();
    const state = this.browserBudget.get(key) ?? {
      count: 0,
      resetAt: now + 60_000,
    };
    if (now > state.resetAt) {
      state.count = 0;
      state.resetAt = now + 60_000;
    }

    if (state.count >= BROWSER_EVENTS_PER_MINUTE) {
      if (state.count === BROWSER_EVENTS_PER_MINUTE) {
        state.count += 1;
        this.emit(key, {
          source: 'browser',
          level: 'warn',
          text: 'browser console is flooding — further messages are dropped for a minute',
          at: now,
        });
      }
      this.browserBudget.set(key, state);
      return false;
    }

    state.count += 1;
    this.browserBudget.set(key, state);
    return true;
  }

  private async ensureFollower(
    projectId: bigint,
    sandboxId: string,
  ): Promise<void> {
    const key = projectId.toString();
    const current = this.followers.get(key);
    if (current && !current.stopping) {
      if (current.sandboxId === sandboxId) return;
      await this.stopFollower(key);
    }
    if (!this.listeners.get(key)?.size) return;

    const follower: LogFollower = {
      key,
      projectId,
      sandboxId,
      pending: '',
      started: false,
      stopping: false,
      failures: 0,
    };
    this.followers.set(key, follower);
    await this.startTail(follower);
  }

  private async startTail(follower: LogFollower): Promise<void> {
    if (follower.stopping) return;
    if (!this.listeners.get(follower.key)?.size) {
      await this.stopFollower(follower.key);
      return;
    }

    // Replay the log backlog only when this project has no captured history:
    // `subscribe` already replays the history, so tailing it again would show
    // the same lines twice when the terminal is reopened.
    const lines =
      follower.started || this.hasServerHistory(follower.key)
        ? 0
        : TAIL_START_LINES;
    const command = `tail -n ${lines} -F ${TAIL_SOURCES} 2>/dev/null`;

    try {
      follower.command = await this.e2bService.streamCommand(
        follower.sandboxId,
        command,
        {
          timeoutMs: TAIL_TIMEOUT_MS,
          onStdout: (chunk) => this.consume(follower, chunk),
        },
      );
      follower.started = true;
      follower.failures = 0;
      this.logger.log(
        `following preview log for project ${follower.key} (pid ${follower.command.pid})`,
      );
      void follower.command.exited.then(() => this.onTailExit(follower));
    } catch (err) {
      follower.failures += 1;
      this.logger.warn(
        `cannot follow preview log for project ${follower.key}: ${String(err)}`,
      );
      this.scheduleRestart(follower);
    }
  }

  private onTailExit(follower: LogFollower): void {
    if (follower.stopping) return;
    follower.command = undefined;
    if (!this.listeners.get(follower.key)?.size) {
      void this.stopFollower(follower.key);
      return;
    }
    // The sandbox was paused, the process timed out or the file vanished:
    // reattach lazily, without replaying the backlog twice.
    this.scheduleRestart(follower);
  }

  private scheduleRestart(follower: LogFollower): void {
    if (follower.stopping || follower.restartTimer) return;
    const delay = Math.min(
      RESTART_BASE_DELAY_MS * Math.max(follower.failures, 1),
      MAX_RESTART_DELAY_MS,
    );
    follower.restartTimer = setTimeout(() => {
      follower.restartTimer = undefined;
      void this.startTail(follower);
    }, delay);
    follower.restartTimer.unref();
  }

  private consume(follower: LogFollower, chunk: string): void {
    const text = follower.pending + chunk;
    const parts = text.split('\n');
    follower.pending = parts.pop() ?? '';
    if (follower.pending.length > MAX_LINE_CHARS * 4) follower.pending = '';

    for (const part of parts) {
      this.pushServerLine(follower.key, part);
    }
  }

  private pushServerLine(key: string, raw: string): void {
    const text = raw.replace(/\r$/, '');
    if (!text.trim()) return;
    // `tail -F a b` prints a header whenever it switches file.
    if (/^==> .+ <==$/.test(text.trim())) return;

    this.emit(key, {
      source: 'server',
      level: classify(text),
      text: text.slice(0, MAX_LINE_CHARS),
      at: Date.now(),
    });
  }

  private async stopFollower(key: string): Promise<void> {
    const follower = this.followers.get(key);
    if (!follower) return;
    follower.stopping = true;
    if (follower.restartTimer) {
      clearTimeout(follower.restartTimer);
      follower.restartTimer = undefined;
    }
    this.followers.delete(key);

    const command = follower.command;
    follower.command = undefined;
    if (command) await command.kill().catch(() => undefined);
  }
}
