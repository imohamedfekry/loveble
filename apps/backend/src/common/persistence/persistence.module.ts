import { Global, Module } from '@nestjs/common';
import { StorageModule } from 'src/Modules/storage/storage.module';
import { PersistFileService } from './persist-file.service';

@Global()
@Module({
  imports: [StorageModule],
  providers: [PersistFileService],
  exports: [PersistFileService],
})
export class PersistenceModule {}
