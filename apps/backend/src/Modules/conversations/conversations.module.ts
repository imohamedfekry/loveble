import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { RepositoryModule } from 'src/common/database/repositories/repository.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RepositoryModule, RealtimeModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
