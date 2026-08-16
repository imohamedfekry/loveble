import { Injectable, Inject } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';

import { BaseRepository } from '../base.repository';

import {
  DRIZZLE_DB,
  type DrizzleDatabase,
} from 'src/common/database/database.constants';

import { File, files, NewFile } from '../../schema/projects/file.schema';

@Injectable()
export class FileRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) db: DrizzleDatabase) {
    super(db);
  }
  async getProjectRootFiles(projectId: bigint): Promise<File[]> {
    return this.db.query.files.findMany({
      where: and(
        eq(files.projectId, projectId),
        sql`${files.parentId} IS NULL`,
      ),
      orderBy: [
        sql`CASE WHEN ${files.type} = 'folder' THEN 0 ELSE 1 END`,
        asc(files.name),
      ],
    });
  }
  async getAllFilesWithProjectId(projectId: bigint): Promise<File[]> {
    return this.db.query.files.findMany({
      where: eq(files.projectId, projectId),
      orderBy: [
        sql`CASE WHEN ${files.type} = 'folder' THEN 0 ELSE 1 END`,
        asc(files.name),
      ],
    });
  }
  async getFile(id: bigint): Promise<File | undefined> {
    return this.db.query.files.findFirst({
      where: eq(files.id, id),
    });
  }
  async isDescendant(
    projectId: bigint,
    ancestorId: bigint,
    descendantId: bigint,
  ): Promise<boolean> {
    const all = await this.getAllFilesWithProjectId(projectId);
    const byId = new Map(all.map((file) => [file.id, file]));

    let current = byId.get(descendantId);

    while (current?.parentId) {
      if (current.parentId === ancestorId) return true;
      current = byId.get(current.parentId);
    }

    return false;
  }
  async getFolderContents(
    projectId: bigint,
    parentId: bigint | null,
  ): Promise<File[]> {
    return this.db.query.files.findMany({
      where: and(
        eq(files.projectId, projectId),
        parentId === null
          ? sql`${files.parentId} IS NULL`
          : eq(files.parentId, parentId),
      ),
      orderBy: [
        sql`CASE WHEN ${files.type} = 'folder' THEN 0 ELSE 1 END`,
        asc(files.name),
      ],
    });
  }
  async createFile(data: NewFile): Promise<File> {
    const [file] = await this.db.insert(files).values(data).returning();

    return file;
  }

  async updateFile(
    fileId: bigint,
    projectId: bigint,
    data: Partial<Pick<File, 'name' | 'parentId'>>,
  ): Promise<File | undefined> {
    const [file] = await this.db
      .update(files)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(files.id, fileId), eq(files.projectId, projectId)))
      .returning();

    return file;
  }

  async deleteFile(
    fileId: bigint,
    projectId: bigint,
  ): Promise<File | undefined> {
    const [file] = await this.db
      .delete(files)
      .where(and(eq(files.id, fileId), eq(files.projectId, projectId)))
      .returning();

    return file;
  }
}
