import { Controller, Get } from '@nestjs/common';

@Controller('inngest')
export class InngestController {
  @Get('test')
  test() {
    return Promise.resolve('Hello Inngest!');
  }
}
