import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

import { RedisService } from 'src/common/redis/redis.service';

export type ProjectChangeKind = 'content' | 'tree';

export interface ProjectChange {
  projectId: string;
  kind: ProjectChangeKind;
  fileId?: string;
  source?: string;
}

@Injectable()
export class ProjectRevisionService {
  private readonly logger = new Logger(ProjectRevisionService.name);
  private readonly revisions = new Map<string, number>();
  private readonly changes = new Subject<ProjectChange>();

  readonly changes$ = this.changes.asObservable();

  constructor(private readonly redisService: RedisService) {}

  private key(projectId: string | bigint): string {
    return `project:${projectId.toString()}:rev`;
  }

  async get(projectId: string | bigint): Promise<number> {
    const key = projectId.toString();
    const cached = this.revisions.get(key);
    if (cached !== undefined) return cached;

    try {
      const client = this.redisService.ensureClient();
      const raw = await client.get(this.key(projectId));
      const value = Number(raw ?? 0) || 0;
      this.revisions.set(key, value);
      return value;
    } catch (err) {
      this.logger.warn(
        `Could not read project revision ${key}: ${String(err)}`,
      );
      return 0;
    }
  }

  async bump(
    projectId: string | bigint,
    kind: ProjectChangeKind,
    fileId?: string,
    source?: string,
  ): Promise<number> {
    const key = projectId.toString();
    let revision = (this.revisions.get(key) ?? 0) + 1;

    try {
      const client = this.redisService.ensureClient();
      revision = await client.incr(this.key(projectId));
    } catch (err) {
      this.logger.warn(
        `Could not bump project revision ${key}: ${String(err)}`,
      );
    }

    this.revisions.set(key, revision);
    this.changes.next({
      projectId: key,
      kind,
      fileId,
      source,
    });
    return revision;
  }

  async set(projectId: string | bigint, revision: number): Promise<void> {
    const key = projectId.toString();
    this.revisions.set(key, revision);
    try {
      const client = this.redisService.ensureClient();
      await client.set(this.key(projectId), String(revision));
    } catch (err) {
      this.logger.warn(
        `Could not persist project revision ${key}: ${String(err)}`,
      );
    }
  }
}
