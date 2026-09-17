import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Req,
  Param,
  Patch,
} from '@nestjs/common';
import { Auth } from 'src/common/decorator/auth-user.decorator';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import { FileService } from './files.service';
import {
  CreateFileDto,
  UpdateFileContentDto,
  UpdateFileDto,
} from './dto/file.dto';
import { ParseSnowflakePipe } from 'src/common/Global/security/validator/isId.validator';

@Controller('projects')
@Auth()
export class FileController {
  constructor(private readonly fileService: FileService) {}
  @Get(':projectId/files')
  getProjectFiles(
    @Param('projectId') projectId: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fileService.findByProjectId(projectId, req);
  }
  @Get(':projectId/files/:folderId')
  getFolderContent(
    @Param('projectId') projectId: bigint,
    @Param('folderId') folderId: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fileService.findFolderContent(projectId, folderId, req);
  }
  // create only save meta data no file upload now
  @Post(':projectId/files')
  createFile(
    @Body() body: CreateFileDto,
    @Req() req: AuthenticatedRequest,
    @Param('projectId', ParseSnowflakePipe) projectId: bigint,
  ) {
    return this.fileService.createFile(body, projectId, req);
  }
  @Get(':projectId/files/:fileId/content')
  getFileContent(
    @Param('projectId', ParseSnowflakePipe) projectId: bigint,
    @Param('fileId', ParseSnowflakePipe) fileId: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fileService.getFileContent(projectId, fileId, req);
  }
  @Put(':projectId/files/:fileId/content')
  updateFileContent(
    @Param('projectId', ParseSnowflakePipe) projectId: bigint,
    @Param('fileId', ParseSnowflakePipe) fileId: bigint,
    @Body() body: UpdateFileContentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fileService.updateFileContent(projectId, fileId, req, body);
  }
  @Patch(':projectId/files/:fileId')
  updateFile(
    @Body() body: UpdateFileDto,
    @Req() req: AuthenticatedRequest,
    @Param('projectId', ParseSnowflakePipe) projectId: bigint,
    @Param('fileId', ParseSnowflakePipe) fileId: bigint,
  ) {
    return this.fileService.updateFile(body, projectId, fileId, req);
  }
  @Delete(':projectId/files/:fileId')
  deleteFile(
    @Req() req: AuthenticatedRequest,
    @Param('projectId', ParseSnowflakePipe) projectId: bigint,
    @Param('fileId', ParseSnowflakePipe) fileId: bigint,
  ) {
    return this.fileService.deleteFile(projectId, fileId, req);
  }
}
