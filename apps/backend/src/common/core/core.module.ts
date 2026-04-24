import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from 'src/common/Global/config/env.validation';
import { DatabaseModule } from '../database/database.module';
import { JwtHelperModule } from '../Global/security/jwt/JwtHelper.Module';
import appConfig from '../bootstrap/config/app.config';
import redisConfig from '../Global/config/redis.config';
import jwtConfig from '../Global/config/jwt.config';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
      load: [appConfig, redisConfig, jwtConfig],
    }),
    DatabaseModule.forRoot(),
    RedisModule,
    JwtHelperModule,
  ],
})
export class CoreModule { }
