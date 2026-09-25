import * as v from 'valibot';
import { createStandardDto } from '@mag123c/nestjs-stdschema';

const QuickEditRequestSchema = v.object({
  selectedCode: v.pipe(v.string(), v.nonEmpty('Selected code is required')),
  fullCode: v.pipe(v.string(), v.nonEmpty('Full code is required')),
  instruction: v.pipe(v.string(), v.nonEmpty('Instruction is required')),
});

const QuickEditResponseSchema = v.object({
  editedCode: v.pipe(v.string(), v.nonEmpty('Edited code is required')),
});

export class QuickEditRequestDto extends createStandardDto(QuickEditRequestSchema) {}
export class QuickEditResponseDto extends createStandardDto(QuickEditResponseSchema) {}
