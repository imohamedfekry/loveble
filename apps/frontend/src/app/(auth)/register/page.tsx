'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useRouter } from 'next/navigation'

import { AuthCard } from '@/components/auth/auth-card'
import { Input } from '@loveble/ui/input'
import { Button } from '@loveble/ui/button'
import { FormError } from '@/components/auth/form-error'
import { requestOtp } from '@/lib/api/apis/auth'
import { emailSchema, type EmailSchema } from '@loveble/validation/register'


export default function RegisterPage() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailSchema>({
    resolver: valibotResolver<EmailSchema, unknown, EmailSchema>(emailSchema),
  })

  const onSubmit = async (data: EmailSchema) => {
    setFormError(null)

    try {
      const res = await requestOtp(data.email)

      if (
        res?.code === 'OTP_REQUEST_SUCCESS' ||
        res?.code === 'OTP_RESENT'
      ) {
        localStorage.setItem('email', data.email)
        router.push(
          `/register/verify-otp?email=${encodeURIComponent(data.email)}`,
        )
      } else {
        setFormError(res?.message || 'Could not send the verification code. Please try again.')
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : (error as { message?: string } | null)?.message
      setFormError(message || 'Could not send the verification code. Check your connection.')
    }
  }

  return (
    <AuthCard title="Create Account" description="Enter your email to get started">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input placeholder="Email" {...register('email')} />
          {errors.email && (
            <FormError message={errors.email.message as string} />
          )}
        </div>

        <FormError message={formError ?? undefined} />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Send OTP
        </Button>
      </form>
    </AuthCard>
  )
}
