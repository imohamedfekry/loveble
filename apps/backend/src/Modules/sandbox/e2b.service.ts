import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Sandbox,
  SandboxError,
  SandboxNotFoundError,
  type CommandHandle,
  type CommandStartOpts,
  type EntryInfo,
  type ProcessInfo,
} from 'e2b';

export interface SandboxStatus {
  sandboxId: string;
  state: 'running' | 'paused';
}

/** A single file to write into the sandbox filesystem. */
export interface SandboxFileEntry {
  path: string;
  data: string;
}

/** Result of starting a background (long-running) command. */
export interface BackgroundCommand {
  pid: number;
}

@Injectable()
export class E2bService {
  private readonly logger = new Logger(E2bService.name);

  constructor(private readonly configService: ConfigService) {}

  async create(): Promise<{ sandboxId: string }> {
    const apiKey = this.configService.get<string>('e2b.key');
    const sandbox = await Sandbox.create({ apiKey: apiKey });

    this.logger.log(`E2B sandbox created: ${sandbox.sandboxId}`);

    return { sandboxId: sandbox.sandboxId };
  }

  /**
   * Verify a sandbox still exists on E2B and is usable.
   * Returns null when the sandbox is gone (expired / killed).
   * Paused sandboxes are resumed so the returned state is 'running'.
   */
  async verify(sandboxId: string): Promise<SandboxStatus | null> {
    const apiKey = this.configService.get<string>('e2b.key');
    console.log(
      'e2b key loaded:',
      apiKey ? `yes (${apiKey.length} chars)` : 'missing',
    );
    try {
      const info = await Sandbox.getInfo(sandboxId, { apiKey: apiKey });

      if (info.state === 'paused') {
        this.logger.log(`E2B sandbox ${sandboxId} found paused — resuming it`);
        await Sandbox.connect(sandboxId, { apiKey: apiKey });
        this.logger.log(`E2B sandbox ${sandboxId} resumed: running`);
        return { sandboxId, state: 'running' };
      }

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
    return Sandbox.connect(sandboxId, { apiKey: apiKey });
  }

  /** Public URL hostname for a port exposed by the sandbox. */
  async getHost(sandboxId: string, port: number): Promise<string> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.getHost(port);
  }

  /** Write multiple files in one request (creates parent directories). */
  async writeFiles(
    sandboxId: string,
    files: SandboxFileEntry[],
    opts?: { requestTimeoutMs?: number },
  ): Promise<void> {
    if (files.length === 0) return;
    const sandbox = await this.connect(sandboxId);
    await sandbox.files.writeFiles(files, {
      requestTimeoutMs: opts?.requestTimeoutMs,
    });
  }

  /** Read a file as UTF-8 text. */
  async readFile(sandboxId: string, path: string): Promise<string> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.files.read(path, { format: 'text' });
  }

  /** Whether a path exists in the sandbox filesystem. */
  async exists(sandboxId: string, path: string): Promise<boolean> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.files.exists(path);
  }

  /** List directory entries. */
  async list(sandboxId: string, path: string): Promise<EntryInfo[]> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.files.list(path);
  }

  /** Run a command to completion and return its output. */
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

  /**
   * Start a long-running command without waiting. The process keeps running on
   * the sandbox; we disconnect the log stream immediately so the connection is
   * not held open for the lifetime of the process.
   */
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
    // Stop receiving output; the process itself keeps running.
    void handle.disconnect().catch(() => undefined);
    return { pid };
  }

  /** List running processes inside the sandbox. */
  async listProcesses(sandboxId: string): Promise<ProcessInfo[]> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.commands.list();
  }

  /** Kill a running process by pid. */
  async killProcess(sandboxId: string, pid: number): Promise<boolean> {
    const sandbox = await this.connect(sandboxId);
    return sandbox.commands.kill(pid);
  }
}
