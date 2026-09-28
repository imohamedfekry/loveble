import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sandbox, SandboxError, SandboxNotFoundError } from 'e2b';

export interface SandboxStatus {
  sandboxId: string;
  state: 'running' | 'paused';
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
}
