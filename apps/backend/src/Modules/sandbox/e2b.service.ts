import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sandbox } from 'e2b';

@Injectable()
export class E2bService {
  constructor(private readonly configService: ConfigService) {}

  async create(): Promise<{ sandboxId: string }> {
    const apiKey = this.configService.get<string>('e2b.key');

    const sandbox = await Sandbox.create({ apiKey });

    return { sandboxId: sandbox.sandboxId };
  }

  async execute(
    sandboxId: string,
    command: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: this.configService.get<string>('e2b.key') ?? '',
    });

    const result = await sandbox.commands.run(command);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  }

  async pause(sandboxId: string): Promise<void> {
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: this.configService.get<string>('e2b.key') ?? '',
    });

    await sandbox.pause();
  }

  async resume(sandboxId: string): Promise<void> {
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: this.configService.get<string>('e2b.key') ?? '',
    });

    await sandbox.connect();
  }

  async kill(sandboxId: string): Promise<void> {
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: this.configService.get<string>('e2b.key') ?? '',
    });

    await sandbox.kill();
  }
}
