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
      where: and(eq(files.projectId, projectId), this.parentEquals(null)),
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
  async findFolderByName(
    projectId: bigint,
    parentId: bigint | null,
    name: string,
  ): Promise<File | undefined> {
    return this.db.query.files.findFirst({
      where: and(
        eq(files.projectId, projectId),
        eq(files.type, 'folder'),
        eq(files.name, name),
        this.parentEquals(parentId),
      ),
    });
  }
  async isDescendant(
    projectId: bigint,
    ancestorId: bigint,
    descendantId: bigint,
  ): Promise<boolean> {
    // Single recursive query instead of loading every file in the project.
    const rows = await this.db.execute<{
      is_descendant: boolean;
    }>(sql`
    WITH RECURSIVE tree AS (
      SELECT id, parent_id
      FROM files
      WHERE id = ${descendantId} AND project_id = ${projectId}
      UNION ALL
      SELECT f.id, f.parent_id
      FROM files f
      JOIN tree t ON f.id = t.parent_id
      WHERE f.project_id = ${projectId}
    )
    SELECT EXISTS (
      SELECT 1 FROM tree WHERE id = ${ancestorId}
    ) AS is_descendant
  `);

    const first = (rows as { rows?: Array<{ is_descendant: boolean }> })
      .rows?.[0];
    return first?.is_descendant === true;
  }
  async getFolderContents(
    projectId: bigint,
    parentId: bigint | null,
  ): Promise<File[]> {
    return this.db.query.files.findMany({
      where: and(eq(files.projectId, projectId), this.parentEquals(parentId)),
      orderBy: [
        sql`CASE WHEN ${files.type} = 'folder' THEN 0 ELSE 1 END`,
        asc(files.name),
      ],
    });
  }
  private parentEquals(parentId: bigint | null) {
    return parentId === null
      ? sql`${files.parentId} IS NULL`
      : eq(files.parentId, parentId);
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
