import { Module } from '@nestjs/common';
import { UserModule } from './Modules/user/user.module';
import { CoreModule } from './common/core/core.module';
import { DefaultModule } from './Modules/default/default.module';
import { RedisModule } from './common/redis/redis.module';

@Module({
  imports: [CoreModule, UserModule, DefaultModule,RedisModule],
})
export class AppModule {}
