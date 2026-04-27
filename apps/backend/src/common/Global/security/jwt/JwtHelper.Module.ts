import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AccessTokenService } from './services/access-token.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { TempTokenService } from './services/temp-token.service';
import { RepositoryModule } from 'src/common/database/repositories/repository.module';
import { OauthTokenService } from './services/oauth-token.service';

@Global()
@Module({
  imports: [
    RepositoryModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.accessToken.secret'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AccessTokenService,
    RefreshTokenService,
    TempTokenService,
    OauthTokenService,
  ],
  exports: [
    JwtModule,
    AccessTokenService,
    RefreshTokenService,
    TempTokenService,
    OauthTokenService
  ],
})
export class JwtHelperModule { }
