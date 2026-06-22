'use client'

import { useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useRouter } from 'next/navigation'

import { AuthCard } from '@/components/auth/auth-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/auth/form-error'
import { requestOtp } from '@/lib/api/auth'
import { emailSchema } from '@/lib/validators/register'


export default function RegisterPage() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: valibotResolver(emailSchema),
  })

  const onSubmit = async (data: { email: string }) => {
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
        alert(res?.message || 'حدث خطأ أثناء إرسال OTP')
      }
    } catch (error: any) {
      console.error('requestOtp error', error)
      alert(error?.message || 'حدث خطأ أثناء إرسال OTP. تأكد من اتصال الإنترنت.')
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Send OTP
        </Button>
      </form>
    </AuthCard>
  )
}