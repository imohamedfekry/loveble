import * as v from 'valibot'

export const emailSchema = v.object({
  email: v.pipe(
    v.string(),
    v.email('Invalid email')
  ),
})

export const otpSchema = v.object({
  otp: v.pipe(
    v.string(),
    v.length(7, 'OTP must be 7 digits')
  ),
})

export const createSchema = v.object({
  name: v.pipe(
    v.string(),
    v.minLength(3)
  ),
  password: v.pipe(
    v.string(),
    v.minLength(8)
  ),
})