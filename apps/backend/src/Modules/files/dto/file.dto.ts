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
})

const updateFileSchema = v.object({
  name: v.pipe(
    v.string('Name must be a string'),
    v.nonEmpty('Name is required'),
    v.maxLength(255, 'Name cannot exceed 255 characters'),
  ),
  parentId: v.optional(snowflakeId),
})

export class UpdateFileDto extends createStandardDto(updateFileSchema) { }
export class CreateFileDto extends createStandardDto(createFileSchema) { }