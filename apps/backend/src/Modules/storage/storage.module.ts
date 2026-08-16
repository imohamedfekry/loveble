import { Module } from '@nestjs/common';
import { S3Provider } from './providers/s3.provider';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Module({
  providers: [S3Provider, StorageService],
  exports: [StorageService],
  controllers: [StorageController],
})
export class StorageModule {}
