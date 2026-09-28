import { Body, Controller, Post } from '@nestjs/common';
import { SandboxService } from './sandbox.service';
import { ExecuteSandboxSchema, SandboxIdSchema } from './dto/sandbox.dto';

@Controller('sandbox')
export class SandboxController {
  constructor(private readonly sandboxService: SandboxService) {}

  @Post('create')
  async create() {
    return this.sandboxService.create();
  }

  @Post('execute')
  async execute(
    @Body({ schema: ExecuteSandboxSchema })
    body: {
      sandboxId: string;
      command: string;
    },
  ) {
    return this.sandboxService.execute(body.sandboxId, body.command);
  }

  @Post('pause')
  async pause(@Body({ schema: SandboxIdSchema }) body: { sandboxId: string }) {
    return this.sandboxService.pause(body.sandboxId);
  }

  @Post('resume')
  async resume(@Body({ schema: SandboxIdSchema }) body: { sandboxId: string }) {
    return this.sandboxService.resume(body.sandboxId);
  }

  @Post('destroy')
  async destroy(
    @Body({ schema: SandboxIdSchema }) body: { sandboxId: string },
  ) {
    return this.sandboxService.destroy(body.sandboxId);
  }
}
