import { Global, Module } from '@nestjs/common';
import { TempUserRepository } from './user/tempUser.repository';
import { UserRepository } from './user/user.repository';
import { OAuthRepository } from './user';

@Global()
@Module({
  providers: [UserRepository, TempUserRepository, OAuthRepository],
  exports: [UserRepository, TempUserRepository, OAuthRepository],
})
export class RepositoryModule {}
