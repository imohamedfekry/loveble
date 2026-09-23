import { Global, Module } from '@nestjs/common';
import { inngest } from './client';
import { InngestController } from './inngest.controller';
import { InngestService } from './inngest.service';

@Global()
@Module({
  controllers: [InngestController],
  providers: [{ provide: 'INNGEST', useValue: inngest }, InngestService],
  exports: ['INNGEST', InngestService],
})
export class InngestModule {}
