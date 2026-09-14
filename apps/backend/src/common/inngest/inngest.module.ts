import { Module, Global } from '@nestjs/common';
import { inngest } from './client';
import { InngestController } from './inngest.controller';
import { InngestService } from './inngest.service';

@Global()
@Module({
  providers: [{ provide: 'INNGEST', useValue: inngest }, InngestService],
  controllers: [InngestController],
  exports: ['INNGEST', InngestService],
})
export class InngestModule {}
