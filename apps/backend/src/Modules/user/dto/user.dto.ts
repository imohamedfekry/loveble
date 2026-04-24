import * as v from 'valibot';
import { createStandardDto } from '@mag123c/nestjs-stdschema';

const TempUserSchema = v.object({
  email: v.pipe(
    v.string('Email is required'),
    v.nonEmpty('Email cannot be empty'),
    v.email('Must be a valid email address'),
    v.maxLength(100, 'Email cannot exceed 100 characters'),
  ),
});

export const UserProfileSchema = v.object({
  id: v.union([v.string(), v.bigint()]),
  username: v.string(),
  email: v.string(),
  mobile: v.nullable(v.string()),
  country: v.nullable(v.string()),
  createdAt: v.date(),
  updatedAt: v.date(),
});

export type UserProfile = v.InferOutput<typeof UserProfileSchema>;

export class TempUserDto extends createStandardDto(TempUserSchema) { }
