import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Sandbox,
  SandboxError,
  SandboxNotFoundError,
  type CommandHandle,
  type CommandStartOpts,
  type EntryInfo,
  type FilesystemEvent,
  type ProcessInfo,
  type WatchHandle,
} from 'e2b';

export interface SandboxWatchOpts {
  recursive?: boolean;
  timeoutMs?: number;
  includeEntry?: boolean;
  onExit?: (err?: Error) => void | Promise<void>;
  requestTimeoutMs?: number;
}

export interface SandboxStatus {
  sandboxId: string;
  state: 'running' | 'paused';
}

export interface SandboxFileEntry {
  path: string;
  data: string | Uint8Array;
}

export interface BackgroundCommand {
  pid: number;
}

export interface PtyHandle {
  pid: number;
  sendInput(data: Uint8Array): Promise<void>;
  resize(cols: number, rows: number): Promise<void>;
  kill(): Promise<boolean>;
  disconnect(): Promise<void>;
  wait(): Promise<{ exitCode?: number }>;
}

export interface PtyOptions {
  cols: number;
  rows: number;
  cwd?: string;
  envs?: Record<string, string>;
  timeoutMs?: number;
  onData: (data: Uint8Array) => void;
}

/** A long-running command whose output is pushed to callbacks as it arrives. */
export interface StreamingCommand {
  pid: number;
  /** Resolves once the process exits (or its stream ends). */
  exited: Promise<void>;
  kill(): Promise<boolean>;
  disconnect(): Promise<void>;
}

export interface StreamingCommandOptions {
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  timeoutMs?: number;
}

@Injectable()
export class E2bService {
  private readonly logger = new Logger(E2bService.name);
  private readonly trafficTokens = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {}

  private rememberTrafficToken(
    sandboxId: string,
    token: string | undefined,
  ): void {
    if (token) this.trafficTokens.set(sandboxId, token);
  }

  trafficToken(sandboxId: string): string | undefined {
    return this.trafficTokens.get(sandboxId);
  }

  async create(): Promise<{ sandboxId: string }> {
    const apiKey = this.configService.get<string>('e2b.key');
    const timeoutMs = this.configService.get<number>('e2b.timeoutMs');
    const template = this.configService.get<string>('e2b.template');

    const options = {
      apiKey,
      timeoutMs,
      network: { 
        allowPublicTraffic: false 
      },
    } as const;
    const sandbox = template
      ? await Sandbox.create(template, options)
      : await Sandbox.create(options);
    this.rememberTrafficToken(sandbox.sandboxId, sandbox.trafficAccessToken);

    this.logger.log(
      `E2B sandbox created: ${sandbox.sandboxId}` +
        (template ? ` from template ${template}` : ''),
    );

    return { sandboxId: sandbox.sandboxId };
  }

  async extend(sandboxId: string): Promise<void> {
    const apiKey = this.configService.get<string>('e2b.key');
    const timeoutMs =
      this.configService.get<number>('e2b.timeoutMs') ?? 3_600_000;
    await Sandbox.setTimeout(sandboxId, timeoutMs, { apiKey });
  }

  async verify(sandboxId: string): Promise<SandboxStatus | null> {
    const apiKey = this.configService.get<string>('e2b.key');
    try {
      const info = await Sandbox.getInfo(sandboxId, { apiKey: apiKey });

      if (info.state === 'paused') {
        this.logger.log(`E2B sandbox ${sandboxId} found paused - resuming it`);
        const resumed = await Sandbox.connect(sandboxId, { apiKey: apiKey });
        this.rememberTrafficToken(sandboxId, resumed.trafficAccessToken);
        await this.extend(sandboxId).catch(() => undefined);
        this.logger.log(`E2B sandbox ${sandboxId} resumed: running`);
        return { sandboxId, state: 'running' };
      }

      await this.extend(sandboxId).catch(() => undefined);
      this.logger.log(
        `E2B sandbox ${sandboxId} verified alive (state: ${info.state})`,
      );
      return { sandboxId, state: info.state };
    } catch (err) {
      if (this.isNotFound(err)) {
        this.logger.warn(
          `E2B sandbox ${sandboxId} no longer exists (expired or killed)`,
        );
        return null;
      }
      throw err;
    }
  }

  private isNotFound(err: unknown): boolean {
    if (err instanceof SandboxNotFoundError) return true;
    if (err instanceof SandboxError && err.statusCode === 404) return true;
    return false;
  }

  async execute(
    sandboxId: string,
    command: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const apiKey = this.configService.get<string>('e2b.key');

    const sandbox = await Sandbox.connect(sandboxId, { apiKey: apiKey });

    const result = await sandbox.commands.run(command);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  }

  async pause(sandboxId: string): Promise<void> {
    const apiKey = this.configService.get<string>('e2b.key');

    const sandbox = await Sandbox.connect(sandboxId, { apiKey: apiKey });

    await sandbox.pause();
  }

  async resume(sandboxId: string): Promise<void> {
    const apiKey = this.configService.get<string>('e2b.key');

    const sandbox = await Sandbox.connect(sandboxId, { apiKey: apiKey });

    await sandbox.connect();
  }

  async kill(sandboxId: string): Promise<void> {
    const apiKey = this.configService.get<string>('e2b.key');

    const sandbox = await Sandbox.connect(sandboxId, { apiKey: apiKey });

    await sandbox.kill();
  }

  private async connect(sandboxId: string): Promise<Sandbox> {
    const apiKey = this.configService.get<string>('e2b.key');
    const sandbox = await Sandbox.connect(sandboxId, { apiKey: apiKey });
    this.rememberTrafficToken(sandboxId, sandbox.trafficAccessToken);
    return sandbox;
  }

  async getHost(sandboxId: string, port: number): Promise<string> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.getHost(port);
  }

  async writeFiles(
    sandboxId: string,
    files: SandboxFileEntry[],
    opts?: { requestTimeoutMs?: number },
  ): Promise<void> {
    if (files.length === 0) return;
    const sandbox = await this.connect(sandboxId);
    await sandbox.files.writeFiles(
      files.map((file) => ({
        path: file.path,
        data:
          typeof file.data === 'string'
            ? file.data
            : new Blob([file.data as BlobPart]),
      })),
      {
        requestTimeoutMs: opts?.requestTimeoutMs,
      },
    );
  }

  async readFile(sandboxId: string, path: string): Promise<string> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.files.read(path, { format: 'text' });
  }

  async readFileBytes(sandboxId: string, path: string): Promise<Uint8Array> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.files.read(path, { format: 'bytes' });
  }

  async exists(sandboxId: string, path: string): Promise<boolean> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.files.exists(path);
  }

  async getInfo(sandboxId: string, path: string): Promise<EntryInfo> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.files.getInfo(path);
  }

  async remove(sandboxId: string, path: string): Promise<void> {
    const sandbox = await this.connect(sandboxId);
    await sandbox.files.remove(path);
  }

  async makeDir(sandboxId: string, path: string): Promise<void> {
    const sandbox = await this.connect(sandboxId);
    await sandbox.files.makeDir(path);
  }

  async list(sandboxId: string, path: string): Promise<EntryInfo[]> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.files.list(path);
  }

  async watchDir(
    sandboxId: string,
    path: string,
    onEvent: (event: FilesystemEvent) => void | Promise<void>,
    opts?: SandboxWatchOpts,
  ): Promise<WatchHandle> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.files.watchDir(path, onEvent, opts);
  }

  async runCommand(
    sandboxId: string,
    command: string,
    opts?: Omit<CommandStartOpts, 'background'>,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const sandbox = await this.connect(sandboxId);
    const result = await sandbox.commands.run(command, opts);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  }

  async runBackground(
    sandboxId: string,
    command: string,
    opts?: Omit<CommandStartOpts, 'background'>,
  ): Promise<BackgroundCommand> {
    const sandbox = await this.connect(sandboxId);
    const handle: CommandHandle = await sandbox.commands.run(command, {
      ...opts,
      background: true,
    });
    const pid = handle.pid;
    void handle.disconnect().catch(() => undefined);
    return { pid };
  }

  /**
   * Start a command that keeps streaming its output to the callbacks until it
   * exits. Unlike {@link runBackground} the handle stays connected, so
   * `onStdout`/`onStderr` keep firing and `exited` resolves when the process
   * ends (killed, timed out or finished).
   */
  async streamCommand(
    sandboxId: string,
    command: string,
    opts: StreamingCommandOptions,
  ): Promise<StreamingCommand> {
    const sandbox = await this.connect(sandboxId);
    const handle: CommandHandle = await sandbox.commands.run(command, {
      background: true,
      timeoutMs: opts.timeoutMs,
      onStdout: opts.onStdout,
      onStderr: opts.onStderr,
    });

    return {
      pid: handle.pid,
      exited: handle.wait().then(
        () => undefined,
        () => undefined,
      ),
      kill: async () => {
        const killed = await handle.kill().catch(() => false);
        await handle.disconnect().catch(() => undefined);
        return killed;
      },
      disconnect: () => handle.disconnect().catch(() => undefined),
    };
  }

  async listProcesses(sandboxId: string): Promise<ProcessInfo[]> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.commands.list();
  }

  async killProcess(sandboxId: string, pid: number): Promise<boolean> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.commands.kill(pid);
  }

  async createPty(sandboxId: string, opts: PtyOptions): Promise<PtyHandle> {
    const sandbox = await this.connect(sandboxId);
    const handle = await sandbox.pty.create({
      cols: opts.cols,
      rows: opts.rows,
      cwd: opts.cwd,
      envs: opts.envs,
      timeoutMs: opts.timeoutMs,
      onData: opts.onData,
    });

    return {
      pid: handle.pid,
      sendInput: (data) => sandbox.pty.sendInput(handle.pid, data),
      resize: (cols, rows) => sandbox.pty.resize(handle.pid, { cols, rows }),
      kill: () => sandbox.pty.kill(handle.pid),
      disconnect: () => handle.disconnect(),
      wait: async () => {
        const result = await handle.wait();
        return { exitCode: result.exitCode };
      },
    };
  }
}
