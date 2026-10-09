import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { RepositoryModule } from 'src/common/database/repositories/repository.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ConversationsWebhookController } from './webhook.controller';

@Module({
  imports: [RepositoryModule, RealtimeModule],
  controllers: [ConversationsController, ConversationsWebhookController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
