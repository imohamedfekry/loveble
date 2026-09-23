import { Module } from '@nestjs/common';
import { projectService } from './project.service';
import { ProjectController } from './project.controller';
import { RepositoryModule } from 'src/common/database/repositories/repository.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [RepositoryModule, RealtimeModule, StorageModule],
  controllers: [ProjectController],
  providers: [projectService],
})
export class projectModule {}
