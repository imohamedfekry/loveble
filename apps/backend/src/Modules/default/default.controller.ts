import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { DefaultService } from './default.service';

@Controller({ version: '1' })
export class DefaultController {
  constructor(private readonly defaultService: DefaultService) {}

  @Get()
  status() {
    return this.defaultService.status();
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async check() {
    return this.defaultService.getHealth();
  }
}
