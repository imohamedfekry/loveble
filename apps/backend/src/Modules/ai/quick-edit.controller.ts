import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { Auth, AuthUser } from 'src/common/decorator/auth-user.decorator';
import type { User } from 'src/common/database/schema';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { runCrawlPipeline } from 'src/common/scraping/crawl-pipeline';
import { AiService } from './ai.service';
import { ProjectPathResolver } from './workspace/project-path.resolver';
import type {
  QuickEditRequestDto,
  QuickEditResponseDto,
} from './dto/quick-edit.dto';
import { QuickEditRequestSchema } from './dto/quick-edit.dto';

/**
 * Inline "Quick Edit" from the code editor. Unlike a one-shot text completion,
 * this runs the quick-edit agent against the project's build workspace, so the
 * change is applied to the real file (through the collaboration pipeline) just
 * like an AI edit in chat — without creating a chat message.
 */
@Controller('ai/quick-edit')
@Auth()
export class QuickEditController {
  constructor(
    private readonly aiService: AiService,
    private readonly fileRepository: FileRepository,
  ) {}

  @Post()
  async edit(
    @Body({ schema: QuickEditRequestSchema }) body: QuickEditRequestDto,
    @AuthUser() user: User,
  ): Promise<QuickEditResponseDto> {
    const projectId = BigInt(body.projectId);
    const files = await this.fileRepository.getAllFilesWithProjectId(projectId);
    const resolver = new ProjectPathResolver(projectId, files);
    const path = resolver.pathOfId(body.fileId);

    if (!path) {
      throw new BadRequestException('File not found in this project');
    }

    // Any URL in the instruction is scraped for documentation context, so the
    // agent can apply an edit based on a referenced page/docs.
    const urls = body.instruction.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
    let documentation = '';
    if (urls.length > 0) {
      try {
        const { data } = await runCrawlPipeline(urls);
        documentation = data
          .map(
            (page) =>
              `<documentation>\nURL: ${page.url}\n\n${page.content}\n</documentation>`,
          )
          .join('\n\n');
      } catch {
        // Scrape failed, continue without documentation.
      }
    }

    const selection =
      typeof body.startLine === 'number' && typeof body.endLine === 'number'
        ? { startLine: body.startLine, endLine: body.endLine }
        : undefined;

    await this.aiService.quickEditProjectFile({
      projectId: body.projectId,
      userId: String(user.id),
      path,
      instruction: body.instruction,
      selection,
      documentation: documentation || undefined,
    });

    return { ok: true, path };
  }
}
