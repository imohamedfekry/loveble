import { Injectable, Logger } from '@nestjs/common';
import { E2bService, type SandboxStatus } from './e2b.service';

export interface EnsureResult {
  sandboxId: string;
  status: SandboxStatus['state'];
  created: boolean;
}

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  constructor(private readonly e2bService: E2bService) {}

  /**
   * Guarantee a usable sandbox: verify the existing one, or create a fresh one.
   * Returns `created: true` when a new sandbox had to be provisioned.
   */
  async ensure(existingSandboxId: string | null): Promise<EnsureResult> {
    if (existingSandboxId) {
      const status = await this.e2bService.verify(existingSandboxId);

      if (status) {
        this.logger.log(
          `Sandbox reuse OK: ${status.sandboxId} (${status.state})`,
        );
        return {
          sandboxId: status.sandboxId,
          status: status.state,
          created: false,
        };
      }

      this.logger.warn(
        `Sandbox ${existingSandboxId} is dead — provisioning a new one`,
      );
    }

    const { sandboxId } = await this.e2bService.create();
    this.logger.log(`Sandbox provisioned: ${sandboxId}`);

    return { sandboxId, status: 'running', created: true };
  }

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
