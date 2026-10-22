import { Module } from '@nestjs/common';

import { PreviewModule } from 'src/Modules/preview/preview.module';
import { RealtimeModule } from 'src/Modules/realtime/realtime.module';
import { SandboxModule } from 'src/Modules/sandbox/sandbox.module';
import { TerminalGateway } from './terminal.gateway';
import { TerminalService } from './terminal.service';

@Module({
  imports: [RealtimeModule, SandboxModule, PreviewModule],
  providers: [TerminalGateway, TerminalService],
})
export class TerminalModule {}
