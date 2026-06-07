import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RepositoryModule } from 'src/common/database/repositories/repository.module';

@Module({
  imports: [
    RepositoryModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}