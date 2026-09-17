import { Module } from '@nestjs/common';
import { projectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProjectGeneratorService } from './project-generator.service';
import { ProjectScaffoldWriter } from './project-scaffold-writer.service';
import { ScaffoldPrompter } from './scaffold/scaffold.prompter';
import { RepositoryModule } from 'src/common/database/repositories/repository.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [RepositoryModule, RealtimeModule, StorageModule],
  controllers: [ProjectController],
  providers: [
    projectService,
    ProjectGeneratorService,
    ProjectScaffoldWriter,
    ScaffoldPrompter,
  ],
})
export class projectModule {}
