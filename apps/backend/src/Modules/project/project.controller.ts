import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  Req,
  Param,
  Headers,
} from '@nestjs/common';
import { Auth } from 'src/common/decorator/auth-user.decorator';
import { projectService } from './project.service';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import {
  GeneratedNameWebhookDto,
  ProjectDto,
  ProjectQueryDto,
  UpdateProjectDto,
} from './dto/project.dto';
import { ParseSnowflakePipe } from 'src/common/Global/security/validator/isId.validator';

@Controller('projects')
@Auth()
export class ProjectController {
  constructor(private readonly projectService: projectService) { }

  @Get('project/:id')
  getProjectById(
    @Param('id', ParseSnowflakePipe) projectId: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectService.findById(projectId, req);
  }

  @Get('all')
  getAllProjects(
    @Req() req: AuthenticatedRequest,
    @Query() query: ProjectQueryDto,
  ) {
    return this.projectService.findAll(req, query);
  }

  @Post('create')
  createProject(@Body() body: ProjectDto, @Req() req: AuthenticatedRequest) {
    return this.projectService.create(body, req);
  }

  @Put()
  updateProject(
    @Query('id', ParseSnowflakePipe) projectId: bigint,
    @Body() body: UpdateProjectDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectService.update(projectId, body, req);
  }

  @Delete()
  deleteProject(
    @Query('id', ParseSnowflakePipe) projectId: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectService.delete(projectId, req);
  }
}
