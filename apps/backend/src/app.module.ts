import { Module } from '@nestjs/common';
import { UserModule } from './Modules/user/user.module';
import { CoreModule } from './common/core/core.module';
import { DefaultModule } from './Modules/default/default.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './Modules/auth/auth.module';
import { projectModule } from './Modules/project/project.module';
import { RealtimeModule } from './Modules/realtime/realtime.module';
import { FileModule } from './Modules/files/files.module';
import { StorageModule } from './Modules/storage/storage.module';
import { QueueModule } from './common/queue/queue.module';

@Module({
  imports: [
    CoreModule,
    UserModule,
    DefaultModule,
    RedisModule,
    AuthModule,
    projectModule,
    RealtimeModule,
    FileModule,
    StorageModule,
    QueueModule,
  ],
})
export class AppModule {}
