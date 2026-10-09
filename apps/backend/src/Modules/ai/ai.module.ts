import { Module } from '@nestjs/common';
import { QuickEditController } from './quick-edit.controller';
import { AgentController } from './agent.controller';
import { ChatController } from './chat.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [QuickEditController, AgentController, ChatController],
  providers: [AiService],
})
export class AiModule {}
