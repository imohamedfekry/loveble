import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { SandboxModule } from '../sandbox/sandbox.module';
import { PreviewController } from './preview.controller';
import { PreviewService } from './preview.service';
import { PreviewTokenService } from './preview-token.service';

@Module({
  imports: [RealtimeModule, SandboxModule],
  controllers: [PreviewController],
  providers: [PreviewService, PreviewTokenService],
  exports: [PreviewService, PreviewTokenService],
})
export class PreviewModule {}
