import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { projectService } from './project.service';
import type { GeneratedNameWebhookDto } from './dto/project.dto';
import { GeneratedNameWebhookSchema } from './dto/project.dto';
import { AuthWebhook } from 'src/common/decorator/auth-webhook.decorator';

@Controller('projects/webhook')
@AuthWebhook()
export class ProjectWebhookController {
  constructor(
    private readonly projectService: projectService,
    private readonly configService: ConfigService,
  ) {}

  @Post('generated-name')
  async generatedName(
    @Headers('authorization') authorization: string,
    @Body({ schema: GeneratedNameWebhookSchema }) body: GeneratedNameWebhookDto,
  ) {
    if (
      authorization !== this.configService.get<string>('inngest.webhookSecret')
    ) {
      throw new UnauthorizedException();
    }

    return this.projectService.applyGeneratedName(body);
  }
}
