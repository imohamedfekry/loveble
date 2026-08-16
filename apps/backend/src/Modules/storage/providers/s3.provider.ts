import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { S3 } from '../storage.constants';

export const S3Provider = {
  provide: S3,
  useFactory: (config: ConfigService) => {
    const storage = config.getOrThrow<{
      endpoint: string;
      region: string;
      accessKey: string;
      secretKey: string;
      forcePathStyle: boolean;
    }>('storage');

    return new S3Client({
      endpoint: storage.endpoint,
      region: storage.region,
      forcePathStyle: storage.forcePathStyle,
      credentials: {
        accessKeyId: storage.accessKey,
        secretAccessKey: storage.secretKey,
      },
    });
  },
  inject: [ConfigService],
};
