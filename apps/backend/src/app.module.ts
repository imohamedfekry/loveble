import { Module } from '@nestjs/common';
import { UserModule } from './Modules/user/user.module';
import { CoreModule } from './common/core/core.module';
import { DefaultModule } from './Modules/default/default.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './Modules/auth/auth.module';

@Module({
  imports: [CoreModule, UserModule, DefaultModule, RedisModule, AuthModule],
})
export class AppModule { }
