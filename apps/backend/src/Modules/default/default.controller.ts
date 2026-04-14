import { Controller, Get } from '@nestjs/common';
import { DefaultService } from './default.service';

/**
 * Root of the versioned API: GET /api/v1
 * (global prefix `api` + URI version `v1` + empty controller path)
 */
@Controller({ version: '1' })
export class DefaultController {
  constructor(private readonly defaultService: DefaultService) {}

  @Get()
  status() {
    return this.defaultService.status();
  }
}
