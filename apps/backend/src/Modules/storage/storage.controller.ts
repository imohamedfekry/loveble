import { Controller } from '@nestjs/common';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}
  // @Post('upload')
  // async upload(
  //   @Body()
  //   body: {
  //     key: string;
  //     content: string;
  //   },
  // ) {
  //   await this.storage.upload({
  //     key: body.key,
  //     body: body.content,
  //   });

  //   return {
  //     success: true,
  //     message: 'Uploaded successfully',
  //     key: body.key,
  //   };
  // }

  // @Get('download/:key')
  // async download(@Param('key') key: string) {
  //   const object = await this.storage.download(key);
  //   console.log(object);
  //   console.log(object.Body);
  //   console.log(object.$metadata);
  //   console.log(object.ContentType);
  //   const content = await object.Body?.transformToString();

  //   return {
  //     success: true,
  //     key,
  //     content,
  //   };
  // }

  // @Get("url/:key")
  // async getUrl(
  //     @Param("key") key: string,
  // ) {
  //     const url = await this.storage.getSignedUrl(key);

  //     return {
  //         success: true,
  //         url,
  //     };
  // }

  // @Delete(":key")
  // async delete(
  //     @Param("key") key: string,
  // ) {
  //     await this.storage.delete(key);

  //     return {
  //         success: true,
  //         message: "Deleted successfully",
  //     };
  // }

  // @Get("exists/:key")
  // async exists(
  //     @Param("key") key: string,
  // ) {
  //     const exists = await this.storage.exists(key);

  //     return {
  //         success: true,
  //         exists,
  //     };
  // }
}
