import { Module } from '@nestjs/common';
import { projectService } from './project.service';
import { ProjectController } from './project.controller';
import { RepositoryModule } from 'src/common/database/repositories/repository.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { StorageModule } from '../storage/storage.module';
import { SandboxModule } from 'src/Modules/sandbox/sandbox.module';
import { ConversationsModule } from 'src/Modules/conversations/conversations.module';
import { ProjectWebhookController } from './webhook.controller';

@Module({
  imports: [
    RepositoryModule,
    RealtimeModule,
    StorageModule,
    SandboxModule,
    ConversationsModule,
  ],
  controllers: [ProjectController, ProjectWebhookController],
  providers: [projectService],
})
export class projectModule {}
