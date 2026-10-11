import { Module } from '@nestjs/common';
import { QuickEditController } from './quick-edit.controller';
import { AgentController } from './agent.controller';
import { ChatController } from './chat.controller';
import { AiService } from './ai.service';
import { AgentWorkspacesService } from './workspace/agent-workspaces.service';
import { ProjectMutationsService } from './workspace/project-mutations.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [QuickEditController, AgentController, ChatController],
  providers: [AiService, AgentWorkspacesService, ProjectMutationsService],
})
export class AiModule {}
