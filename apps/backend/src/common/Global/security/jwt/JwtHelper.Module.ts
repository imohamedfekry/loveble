import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtHelper } from './jwt.helper';
import { RepositoryModule } from 'src/common/database/repositories/repository.module';

@Global()
@Module({
  imports: [
    RepositoryModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.accessToken.secret'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtHelper],
  exports: [JwtHelper, JwtModule],
})
export class JwtHelperModule {}
