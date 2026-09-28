import * as v from 'valibot';
import { snowflakeId } from 'src/common/Global/security/validator/isId.validator';

enum fileTypesEnum {
  file = 'file',
  folder = 'folder',
}

export const CreateFileSchema = v.object({
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

export const UpdateFileSchema = v.object({
  name: v.optional(
    v.pipe(
      v.string('Name must be a string'),
      v.nonEmpty('Name is required'),
      v.maxLength(255, 'Name cannot exceed 255 characters'),
    ),
  ),
  parentId: v.optional(v.nullable(snowflakeId)),
});

export const FileStandardSchema = v.object({
  id: v.bigint(),
  projectId: v.bigint(),
  parentId: v.nullable(v.bigint()),
  name: v.string(),
  type: v.picklist(['file', 'folder']),
  storageKey: v.nullable(v.string()),
  createdAt: v.date(),
  updatedAt: v.date(),
});

export const UpdateFileContentSchema = v.object({
  content: v.string('Content must be a string'),
});

export const FileStandard = FileStandardSchema;
export type FileStandard = v.InferOutput<typeof FileStandardSchema>;
export type CreateFileDto = v.InferOutput<typeof CreateFileSchema>;
export type UpdateFileDto = v.InferOutput<typeof UpdateFileSchema>;
export type UpdateFileContentDto = v.InferOutput<
  typeof UpdateFileContentSchema
>;
