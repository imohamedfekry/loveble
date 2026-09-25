import { Module } from '@nestjs/common';
import { QuickEditController } from './quick-edit.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [QuickEditController],
  providers: [AiService],
})
export class AiModule {}