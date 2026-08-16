import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { env } from 'src/common/Global/config/env.validation';
import { DatabaseModule } from '../database/database.module';
import { JwtHelperModule } from '../Global/security/jwt/JwtHelper.Module';
import appConfig from '../bootstrap/config/app.config';
import redisConfig from '../Global/config/redis.config';
import jwtConfig from '../Global/config/jwt.config';
import { RedisModule } from '../redis/redis.module';
import { SentryModule } from '@sentry/nestjs/setup';
import storageConfig from '../Global/config/storage.config';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: env,
      load: [appConfig, redisConfig, jwtConfig, storageConfig],
    }),
    DatabaseModule.forRoot(),
    RedisModule,
    JwtHelperModule,
  ],
})
export class CoreModule {}
