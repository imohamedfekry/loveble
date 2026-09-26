import { Module } from '@nestjs/common';
import { SandboxController } from './sandbox.controller';
import { SandboxService } from './sandbox.service';
import { E2bService } from './e2b.service';

@Module({
  controllers: [SandboxController],
  providers: [SandboxService, E2bService],
  exports: [SandboxService],
})
export class SandboxModule {}
