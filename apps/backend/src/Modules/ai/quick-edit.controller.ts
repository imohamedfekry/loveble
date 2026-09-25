import { Body, Controller, Post } from '@nestjs/common';
import { Auth } from 'src/common/decorator/auth-user.decorator';
import { AiService } from './ai.service';
import { QuickEditRequestDto, QuickEditResponseDto } from './dto/quick-edit.dto';
import { runCrawlPipeline } from 'src/common/scraping/crawl-pipeline';

@Controller('ai/quick-edit')
@Auth()
export class QuickEditController {
  constructor(private readonly aiService: AiService) { }

  @Post()
  async edit(@Body() body: QuickEditRequestDto): Promise<QuickEditResponseDto> {
    const urls = body.instruction.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
    let documentationContext = '';

    if (urls.length > 0) {
      try {
        const { data } = await runCrawlPipeline(urls);
        documentationContext = data
          .map(
            (page) =>
              `<documentation>\nURL: ${page.url}\n\n${page.content}\n</documentation>`,
          )
          .join('\n\n');
      } catch {
        // Scrape failed, continue without documentation
      }
    }

    let prompt = [
      'Edit the selected code based on the user\'s instruction.',
      '',
      'Selected Code:',
      body.selectedCode,
      '',
      'Full Code:',
      body.fullCode,
      '',
      `Instruction: ${body.instruction}`,
    ].join('\n');

    if (documentationContext) {
      prompt += `\n\nDocumentation Context:\n${documentationContext}`;
    }
    prompt += `\n\nReturn only the raw code with no markdown code fences (no \`\`\` at all), no language tags, no explanations. Just the plain code text, maintaining the same indentation level as original. If the instruction is unclear or can't be applied, return the original code unchanged.`;
    prompt += `\n\nReturn only the edited version of the selected code. Maintain the same indentation level as original. Not include any explanations or comments unless requested. If the instruction is unclear or can't be applied, return the original code unchanged.`;

    const editedCode = await this.aiService.generateEdit(prompt, documentationContext);
    console.log('Edited Code:', editedCode);
    return { editedCode };
  }
}
