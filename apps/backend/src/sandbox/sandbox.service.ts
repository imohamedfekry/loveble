import { Injectable } from '@nestjs/common';
import { E2bService } from './e2b.service';

@Injectable()
export class SandboxService {
  constructor(private readonly e2bService: E2bService) {}

  async create(): Promise<{ sandboxId: string }> {
    return this.e2bService.create();
  }

  async execute(
    sandboxId: string,
    command: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return this.e2bService.execute(sandboxId, command);
  }

  async pause(sandboxId: string): Promise<void> {
    return this.e2bService.pause(sandboxId);
  }

  async resume(sandboxId: string): Promise<void> {
    return this.e2bService.resume(sandboxId);
  }

  async destroy(sandboxId: string): Promise<void> {
    return this.e2bService.kill(sandboxId);
  }
}
