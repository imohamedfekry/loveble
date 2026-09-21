import { Injectable, Logger } from '@nestjs/common';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { RealtimeEmitService } from 'src/Modules/realtime/core/realtime-emit.service';
import { PROJECT_EVENTS } from '../realtime/events/project.events';
import type { Project } from 'src/common/database/schema/projects/project.schema';
import { sanitizeScaffold } from './scaffold/scaffold.parser';
import { ScaffoldPrompter } from './scaffold/scaffold.prompter';
import { ProjectScaffoldWriter } from './project-scaffold-writer.service';

@Injectable()
export class ProjectGeneratorService {
  private readonly logger = new Logger(ProjectGeneratorService.name);

  constructor(
    private readonly prompter: ScaffoldPrompter,
    private readonly writer: ProjectScaffoldWriter,
    private readonly projectRepository: ProjectRepository,
    private readonly realtimeEmitService: RealtimeEmitService,
  ) {}

  /** Kick off generation from a prompt.  Never throws — the project row is
   *  already saved, so any failure here is logged and nothing else. */
  async generateFromPrompt(project: Project, prompt: string): Promise<void> {
    try {
      const scaffold = sanitizeScaffold(await this.prompter.generate(prompt));

      if (scaffold.files.length === 0 && !scaffold.name) {
        this.logger.warn(
          `Generation produced no scaffold for project ${project.id}`,
        );
        return;
      }

      if (scaffold.name) {
        await this.applyProjectName(project, scaffold.name);
      }

      await this.writer.writeFiles(project, scaffold.files);
    } catch (err) {
      this.logger.error(
        `Project generation failed for ${project.id}: ${err instanceof Error ? err.stack : err}`,
      );
    }
  }

  private async applyProjectName(
    project: Project,
    name: string,
  ): Promise<void> {
    try {
      await this.projectRepository.update(project.id, { name });
      const updated = await this.projectRepository.findById(project.id);
      if (updated?.userId) {
        this.realtimeEmitService.toUser(
          updated.userId.toString(),
          PROJECT_EVENTS.UPDATED,
          updated,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to update generated name for project ${project.id}: ${err}`,
      );
    }
  }
}
