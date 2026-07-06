import { Module } from '@nestjs/common';
import { RepositoryModule } from 'src/common/database/repositories/repository.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { FileController } from './files.controller';
import { FileService } from './files.service';

@Module({
    imports: [
      RepositoryModule,
      RealtimeModule
    ],
  controllers: [FileController],
  providers: [FileService],
})
export class FileModule {}
