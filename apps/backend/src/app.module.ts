import { Module } from '@nestjs/common';
import { UserModule } from './Modules/user/user.module';
import { CoreModule } from './common/core/core.module';
import { DefaultModule } from './Modules/default/default.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './Modules/auth/auth.module';
import { QueueModule } from './Modules/queue/queue.module';
import { projectModule } from './Modules/project/project.module';
import { RealtimeModule } from './Modules/realtime/realtime.module';

@Module({
  imports: [CoreModule, UserModule, DefaultModule, RedisModule, AuthModule, QueueModule,projectModule,RealtimeModule],
})
export class AppModule { }
