import { Body, Controller, Delete, Get, Post, Put, Query, Req, Res } from '@nestjs/common';
import { Auth } from 'src/common/decorator/auth-user.decorator';
import { projectService } from './project.service';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import { ProjectDto, UpdateProjectDto } from './dto/project.dto';

@Controller('project')
@Auth()
export class ProjectController {
  constructor(private readonly projectService: projectService) {}

  @Get()
  @Auth()
  getAllProjects(@Req() req: AuthenticatedRequest) {
    return this.projectService.findAll(req);
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
  @Delete('')
  deleteProject(@Query('id') projectId: bigint, @Req() req: AuthenticatedRequest) {
    return this.projectService.delete(projectId, req);
  }
  // how delete show in url ? delete?id=1
  // http://localhost:3001/api/v1/project/?id=123456
}