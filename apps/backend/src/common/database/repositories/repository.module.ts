import { Global, Module } from '@nestjs/common';
import { TempUserRepository } from './user/tempUser.repository';
import { UserRepository } from './user/user.repository';
import { OAuthRepository } from './user';
import { ProjectRepository } from './project/project.repository';
import { FileRepository } from './project/file.repository';
import { ConversationRepository } from './conversations/conversation.repository';
import { MessageRepository } from './conversations/message.repository';

@Global()
@Module({
  providers: [
    UserRepository,
    TempUserRepository,
    OAuthRepository,
    ProjectRepository,
    FileRepository,
    ConversationRepository,
    MessageRepository,
  ],
  exports: [
    UserRepository,
    TempUserRepository,
    OAuthRepository,
    ProjectRepository,
    FileRepository,
    ConversationRepository,
    MessageRepository,
  ],
})
export class RepositoryModule {}
