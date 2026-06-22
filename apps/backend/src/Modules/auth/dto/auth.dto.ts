import * as v from 'valibot';
import { createStandardDto } from '@mag123c/nestjs-stdschema';

const TempUserSchema = v.object({
  email: v.pipe(
    v.string('Email must be a string'),
    v.nonEmpty('Email is required'),
    v.email('Please enter a valid email address'),
    v.maxLength(100, 'Email cannot exceed 100 characters'),
  ),
});

const verfyOtpSchema = v.object({
  email: v.pipe(
    v.string('Email must be a string'),
    v.nonEmpty('Email is required'),
    v.email('Please enter a valid email address'),
    v.maxLength(100, 'Email cannot exceed 100 characters'),
  ),
  otp: v.pipe(
    v.string('OTP must be a string'),
    v.nonEmpty('OTP is required'),
    v.minLength(7, 'OTP must be exactly 7 characters'),
    v.maxLength(7, 'OTP must be exactly 7 characters'),
  ),
});

const CreateUserSchema = v.object({
  name: v.pipe(
    v.string('Name must be a string'),
    v.nonEmpty('Name is required'),
    v.minLength(3, 'Name must be at least 3 characters'),
    v.maxLength(50, 'Name cannot exceed 50 characters'),
  ),

  password: v.pipe(
    v.string('Password must be a string'),
    v.nonEmpty('Password is required'),
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

const LoginSchema = v.object({
  email: v.pipe(
    v.string('Email must be a string'),
    v.nonEmpty('Email is required'),
    v.email('Please enter a valid email address'),
    v.maxLength(100, 'Email cannot exceed 100 characters'),
  ),
  password: v.pipe(
    v.string('Password must be a string'),
    v.nonEmpty('Password is required'),
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

const GithubCallbackSchema = v.object({
  code: v.pipe(
    v.string('Code must be a string'),
    v.nonEmpty('Code is required'),
  ),

  state: v.optional(
    v.pipe(
      v.string('State must be a string'),
      v.nonEmpty('State cannot be empty'),
    )
  ),
});

export class GithubCallbackDto extends createStandardDto(GithubCallbackSchema) {
  
  code: string;
  state?: string;
}

export class TempUserDto extends createStandardDto(TempUserSchema) {
  email: string;
}

export class verfyOtpDto extends createStandardDto(verfyOtpSchema) {

  email: string;

  otp: string;
}

export class CreateUserDto extends createStandardDto(CreateUserSchema) {

  name: string;

  password: string;
}

export class LoginDto extends createStandardDto(LoginSchema) {
  email: string;

  password: string;
}

