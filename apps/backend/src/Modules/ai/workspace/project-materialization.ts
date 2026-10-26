import { Logger } from '@nestjs/common';
import { getNestApp } from 'src/common/inngest/nest-context';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { PreviewService } from 'src/Modules/preview/preview.service';

const log = new Logger('ProjectMaterialization');

/**
 * Hard gate for agent runs.
 *
 * The agent workspace is database-backed and never reads the sandbox, so a
 * project whose E2B template has not been adopted into the database yet looks
 * completely empty to the model — and the model starts rebuilding the scaffold
 * file by file. Every entry point that hands a project to an agent awaits this
 * first; it is a cheap no-op once the project has any file.
 */
export async function ensureProjectMaterialized(
  projectId: bigint,
  reason: string,
): Promise<void> {
  try {
    const app = getNestApp();
    const fileRepository = app.get(FileRepository);

    const existing = await fileRepository.getAllFilesWithProjectId(projectId);
    if (existing.length > 0) return;

    const startedAt = Date.now();
    await app.get(PreviewService).prepareSandbox(projectId);

    const files = await fileRepository.getAllFilesWithProjectId(projectId);
    log.log(
      `workspace ready for project ${projectId} before ${reason}: ` +
        `${files.length} files in ${Date.now() - startedAt}ms`,
    );
    if (files.length === 0) {
      log.warn(
        `project ${projectId} is still empty after materialization (before ${reason})`,
      );
    }
  } catch (error) {
    log.warn(
      `could not materialize project ${projectId} before ${reason}: ${String(error)}`,
    );
  }
}
