import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { SandboxModule } from '../sandbox/sandbox.module';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { PreviewController } from './preview.controller';
import { PreviewLogService } from './preview-logs.service';
import { PreviewService } from './preview.service';
import { PreviewTokenService } from './preview-token.service';

@Module({
  imports: [RealtimeModule, SandboxModule, AiModule, StorageModule],
  controllers: [PreviewController],
  providers: [PreviewService, PreviewTokenService, PreviewLogService],
  exports: [PreviewService, PreviewTokenService, PreviewLogService],
})
export class PreviewModule {}
