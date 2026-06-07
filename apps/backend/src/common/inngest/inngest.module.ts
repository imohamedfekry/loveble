import { Module, Global } from '@nestjs/common';
import { inngest } from './client';
import { InngestController } from './inngest.controller';

@Global()
@Module({
  providers: [{ provide: 'INNGEST', useValue: inngest }],
  controllers: [InngestController],
  exports: ['INNGEST'],
})
export class InngestModule {}