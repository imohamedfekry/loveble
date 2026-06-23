import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DRIZZLE_DB } from 'src/common/database/database.constants';
import type { DrizzleDatabase } from 'src/common/database/database.constants';
import { File, files } from '../../schema/projects/file.schema';
import { eq } from 'drizzle-orm';
@Injectable()
export class FileRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) db: DrizzleDatabase) {
    super(db);
  }
  async getAllfilesWithProjectId(
     projectId : bigint
  ): Promise<File[]>{
    return this.db.select().from(files).where(eq(files.projectId, projectId));
  }
  async getFile(
    id:bigint
  ){
    return this.db.select().from(files).where(eq(files.id,id))
  }
}