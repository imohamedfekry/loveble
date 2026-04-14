import { Module } from '@nestjs/common';
import { UserModule } from './Modules/user/user.module';
import { CoreModule } from './common/core/core.module';

@Module({
  imports: [CoreModule, UserModule],
})
export class AppModule {}
