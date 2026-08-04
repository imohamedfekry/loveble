import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Readable } from "node:stream";
import { S3 } from "./storage.constants";
import { RESPONSE_MESSAGES } from "src/common/utils/response-messages";
import { fail } from "src/common/utils/response.util";
import { StorageObject } from "src/common/utils/types";

@Injectable()
export class StorageService {
  private readonly bucket: string;

  constructor(
    @Inject(S3)
    private readonly client: S3Client,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.getOrThrow<string>("storage.bucket");
  }

  async upload(params: {
    key: string;
    body: Buffer | Uint8Array | Readable | string;
    contentType?: string;
  }) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );

    return {
      key: params.key,
    };
  }

  async download(key: string) {
    return this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }



  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(
    key: string,
    expiresIn = 60 * 60,
  ) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      {
        expiresIn,
      },
    );
  }
  // Used in file service //

  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
async updateFileContent(
  key: string,
  content: string,
) {
  await this.client.send(
    new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: content,
      ContentType: "text/plain; charset=utf-8",
    }),
  );
}
async getFileContent(key: string): Promise<string> {
  const object = await this.client.send(
    new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }),
  );

  if (!object.Body) {
    throw new NotFoundException(
      fail(RESPONSE_MESSAGES.FILE.NOT_FOUND),
    );
  }

  return object.Body.transformToString("utf-8");
}

}