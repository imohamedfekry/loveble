import { Controller, Get, NotFoundException, Param, Req } from '@nestjs/common';
import { Auth } from 'src/common/decorator/auth-user.decorator';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import { ParseSnowflakePipe } from 'src/common/Global/security/validator/isId.validator';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { success } from 'src/common/utils/response.util';
import { PREVIEW_IFRAME_TOKEN_TTL_MS } from './preview.constants';
import { PreviewService } from './preview.service';
import { PreviewTokenService } from './preview-token.service';

const PREVIEW_STATUS_MSG = {
  code: 'PREVIEW_STATUS',
  message: 'Preview status fetched successfully',
};

@Controller('preview')
export class PreviewController {
  constructor(
    private readonly previewService: PreviewService,
    private readonly previewTokens: PreviewTokenService,
    private readonly projectRepository: ProjectRepository,
  ) {}

  @Get(':projectId/status')
  @Auth()
  async status(
    @Param('projectId', ParseSnowflakePipe) projectId: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException('Project not found');
    }

    // Kick provisioning in the background and report the current state so the
    // request never blocks on an install/start cycle (which can take minutes).
    void this.previewService.ensure(projectId).catch(() => undefined);

    const state = this.previewService.peek(projectId);
    const ready = state?.status === 'ready' && state.url;

    return success(PREVIEW_STATUS_MSG, {
      status: state?.status ?? 'starting',
      url: state?.url,
      error: state?.error,
      // The preview iframe is cross-origin; this token bootstraps an HttpOnly
      // cookie on the project's preview subdomain.
      token: ready
        ? this.previewTokens.issue(
            projectId.toString(),
            PREVIEW_IFRAME_TOKEN_TTL_MS,
          )
        : undefined,
    });
  }
}
