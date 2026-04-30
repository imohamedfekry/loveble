import * as v from 'valibot';
import { createStandardDto } from '@mag123c/nestjs-stdschema';
enum ImportStatus {
  importing = 'importing',
  completed = 'completed',
  failed = 'failed',
}

const projectSchema = v.object({
  name: v.pipe(
    v.string('Name must be a string'),
    v.nonEmpty('Name is required'),
    v.maxLength(100, 'Name cannot exceed 100 characters'),
  ),
});
const updateProjectSchema = v.object({
  name: v.pipe(
    v.string('Name must be a string'),
    v.nonEmpty('Name is required'),
    v.maxLength(100, 'Name cannot exceed 100 characters'),
  ),
  importStatus: v.pipe(
    v.optional(
      v.enum(
        ImportStatus,
        `Expected one of: ${Object.values(ImportStatus).join(', ')}`,
      ),
    ),
  ),
});
export class ProjectDto extends createStandardDto(projectSchema) {}
export class UpdateProjectDto extends createStandardDto(updateProjectSchema) {}
