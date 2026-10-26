import { Module } from '@nestjs/common';
import { QuickEditController } from './quick-edit.controller';
import { ChatController } from './chat.controller';
import { AiService } from './ai.service';
import { AgentWorkspacesService } from './workspace/agent-workspaces.service';
import { ProjectMutationsService } from './workspace/project-mutations.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [RealtimeModule, StorageModule],
  controllers: [QuickEditController, ChatController],
  providers: [AiService, AgentWorkspacesService, ProjectMutationsService],
  exports: [ProjectMutationsService],
})
export class AiModule {}
