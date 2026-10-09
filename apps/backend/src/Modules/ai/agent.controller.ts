import { Body, Controller, Post } from '@nestjs/common';
import { Auth } from 'src/common/decorator/auth-user.decorator';
import { AiService } from './ai.service';
import type {
  AgentGenerateRequestDto,
  AgentGenerateResponseDto,
} from './dto/agent.dto';
import { AgentGenerateRequestSchema } from './dto/agent.dto';

@Controller('ai/agent')
@Auth()
export class AgentController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  generate(
    @Body({ schema: AgentGenerateRequestSchema })
    body: AgentGenerateRequestDto,
  ): Promise<AgentGenerateResponseDto> {
    return this.aiService.generateWithAgent(body.prompt, body.model);
  }
}
