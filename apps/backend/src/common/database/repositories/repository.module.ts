import { Global, Module } from '@nestjs/common';
import { TempUserRepository } from './user/tempUser.repository';
import { UserRepository } from './user/user.repository';
import { OAuthRepository } from './user';
import { ProjectRepository } from './project/project.repository';

@Global()
@Module({
  providers: [UserRepository, TempUserRepository, OAuthRepository,ProjectRepository],
  exports: [UserRepository, TempUserRepository, OAuthRepository,ProjectRepository],
})
export class RepositoryModule {}
