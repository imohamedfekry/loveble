import { Body, Controller, Delete, Get, Post, Put, Query, Req, Param } from '@nestjs/common';
import { Auth } from 'src/common/decorator/auth-user.decorator';
import { projectService } from './project.service';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import { ProjectDto, ProjectQueryDto, UpdateProjectDto } from './dto/project.dto';

@Controller('projects')
@Auth()
export class ProjectController {
  constructor(private readonly projectService: projectService) {}

  @Get('project/:id')
  getProjectById(@Param('id') projectId: string, @Req() req: AuthenticatedRequest) {
    return this.projectService.findById(BigInt(projectId), req);
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
    @Query('id') projectId: bigint,
    @Body() body: UpdateProjectDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectService.update(projectId, body, req);
  }

  @Delete()
  deleteProject(@Query('id') projectId: bigint, @Req() req: AuthenticatedRequest) {
    return this.projectService.delete(projectId, req);
  }
}