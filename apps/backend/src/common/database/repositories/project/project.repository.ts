import { Injectable, Inject } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { BaseRepository } from '../base.repository';
import { DRIZZLE_DB } from 'src/common/database/database.constants';
import type { DrizzleDatabase } from 'src/common/database/database.constants';
import {
  NewProject,
  Project,
  projects,
} from '../../schema/projects/project.schema';

@Injectable()
export class ProjectRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) db: DrizzleDatabase) {
    super(db);
  }

  async create(data: NewProject): Promise<Project> {
    const [project] = await this.db.insert(projects).values(data).returning();

    return project;
  }

  async findById(id: bigint): Promise<Project | null> {
    const result = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    return result[0] ?? null;
  }
  async findByUserId(userId: bigint): Promise<Project[]> {
    return this.db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt));
  }
  async update(
    id: bigint,
    data: Partial<Omit<Project, 'id' | 'userId'>>,
  ): Promise<Project | null> {
    const [project] = await this.db
      .update(projects)
      .set(data)
      .where(eq(projects.id, id))
      .returning();
    return project ?? null;
  }
  async delete(id: bigint): Promise<boolean> {
    const result = await this.db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();

    return result.length > 0;
  }
}
