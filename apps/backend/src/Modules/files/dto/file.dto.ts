import * as v from 'valibot';
import { createStandardDto } from '@mag123c/nestjs-stdschema';
import { snowflakeId } from 'src/common/Global/security/validator/isId.validator';
enum fileTypesEnum {
  file = 'file',
  folder = 'folder',
}

const createFileSchema = v.object({
  type: v.pipe(
    v.enum(
      fileTypesEnum,
      `Expected one of: ${Object.values(fileTypesEnum).join(', ')}`,
    ),
  ),
  name: v.pipe(
    v.string('Name must be a string'),
    v.nonEmpty('Name is required'),
    v.maxLength(255, 'Name cannot exceed 255 characters'),
  ),
  parentId: v.optional(snowflakeId),
});

const updateFileSchema = v.object({
  name: v.optional(
    v.pipe(
      v.string('Name must be a string'),
      v.nonEmpty('Name is required'),
      v.maxLength(255, 'Name cannot exceed 255 characters'),
    ),
  ),
  parentId: v.optional(v.nullable(snowflakeId)),
});

export const FileStandard = v.object({
  id: v.bigint(),
  projectId: v.bigint(),
  parentId: v.nullable(v.bigint()),
  name: v.string(),
  type: v.picklist(['file', 'folder']),
  version: v.number(),
  createdAt: v.date(),
  updatedAt: v.date(),
});
export const updateFileContentSchema = v.object({
  content: v.string('Content must be a string'),
});

export type FileStandard = v.InferOutput<typeof FileStandard>;
export class UpdateFileDto extends createStandardDto(updateFileSchema) {}
export class UpdateFileContentDto extends createStandardDto(
  updateFileContentSchema,
) {}
export class CreateFileDto extends createStandardDto(createFileSchema) {}
