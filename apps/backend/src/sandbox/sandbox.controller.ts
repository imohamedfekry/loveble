import { Body, Controller, Post } from '@nestjs/common';
import { SandboxService } from './sandbox.service';

@Controller('sandbox')
export class SandboxController {
  constructor(private readonly sandboxService: SandboxService) {}

  @Post('create')
  async create() {
    return this.sandboxService.create();
  }

  @Post('execute')
  async execute(
    @Body('sandboxId') sandboxId: string,
    @Body('command') command: string,
  ) {
    return this.sandboxService.execute(sandboxId, command);
  }

  @Post('pause')
  async pause(@Body('sandboxId') sandboxId: string) {
    return this.sandboxService.pause(sandboxId);
  }

  @Post('resume')
  async resume(@Body('sandboxId') sandboxId: string) {
    return this.sandboxService.resume(sandboxId);
  }

  @Post('destroy')
  async destroy(@Body('sandboxId') sandboxId: string) {
    return this.sandboxService.destroy(sandboxId);
  }
}
