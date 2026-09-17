import { Controller, Get } from '@nestjs/common';

@Controller('inngest')
export class InngestController {
  @Get('test')
  async test() {
    return 'Hello Inngest!';
  }
}
