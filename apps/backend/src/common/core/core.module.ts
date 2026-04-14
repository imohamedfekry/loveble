import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from 'src/common/Global/config/env.validation';
import { DatabaseModule } from '../database/database.module';
import { JwtHelperModule } from '../Global/security/jwt/JwtHelper.Module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    DatabaseModule.forRoot(),
    JwtHelperModule,
  ],
})
export class CoreModule {}
