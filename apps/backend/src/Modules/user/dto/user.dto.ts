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
const verfyOtpSchema = v.object({
    email: v.pipe(
    v.string('Email is required'),
    v.nonEmpty('Email cannot be empty'),
    v.email('Must be a valid email address'),
    v.maxLength(100, 'Email cannot exceed 100 characters'),
  ),
  otp: v.pipe(
    v.string('OTP is required'),
    v.nonEmpty('OTP cannot be empty'),
    v.minLength(7, 'OTP must be at least 7 characters'),
    v.maxLength(7, 'OTP cannot exceed 7 characters'),
  ),
})
const CreateUserSchema = v.object({
  name: v.pipe(
    v.string('Name is required'),
    v.nonEmpty('Name cannot be empty'),
    v.minLength(3, 'Name must be at least 3 characters'),
    v.maxLength(50, 'Name cannot exceed 50 characters'),
  ),

  email: v.pipe(
    v.string('Email is required'),
    v.nonEmpty('Email cannot be empty'),
    v.email('Must be a valid email address'),
    v.maxLength(100, 'Email cannot exceed 100 characters'),
  ),

  password: v.pipe(
    v.string('Password is required'),
    v.nonEmpty('Password cannot be empty'),
    v.minLength(8, 'Password must be at least 8 characters'),
    v.maxLength(64, 'Password cannot exceed 64 characters'),
    v.regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
    v.regex(/[a-z]/, 'Password must contain at least one lowercase letter'),
    v.regex(/[0-9]/, 'Password must contain at least one number'),
    v.regex(
      /[^A-Za-z0-9]/,
      'Password must contain at least one special character',
    ),
  ),
});
export class TempUserDto extends createStandardDto(TempUserSchema) {}
export class verfyOtpDto extends createStandardDto(verfyOtpSchema){}
export class CreateUserDto extends createStandardDto(CreateUserSchema) {}
