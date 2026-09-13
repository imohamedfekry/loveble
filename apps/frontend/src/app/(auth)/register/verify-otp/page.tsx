'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthCard } from '@/components/auth/auth-card'
import { verifyOtp } from '@/lib/api/apis/auth'
import { OTPInput } from '@/components/ui/otp-input'
import * as v from 'valibot'
import { otpSchema } from '@/lib/validators/register'
import { FormError } from '@/components/auth/form-error'

export default function VerifyOtpPage() {
  const router = useRouter()

  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const email =
    typeof window !== 'undefined'
      ? localStorage.getItem('email')
      : null

  const handleVerify = useCallback(async (code: string) => {
    const result = v.safeParse(otpSchema, { otp: code })

    if (!result.success) {
      setError(result.issues[0].message)
      return
    }

    if (!email) {
      setError('ارجع صفحة التسجيل الأول')
      router.push('/register')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await verifyOtp(email, code)

      if (res?.code === 'OTP_VERIFIED') {
        router.push('/register/create')
      } else {
        setError(res?.message || 'OTP غير صحيح')
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : (err as { message?: string } | null)?.message;
      setError(message || 'حصل خطأ')
    } finally {
      setLoading(false)
    }
  }, [email, router])

  const handleOtpChange = (next: string) => {
    setOtp(next)
    if (next.length === 7) {
      handleVerify(next)
    }
  }

  return (
    <AuthCard title="Verify OTP" description="Enter the code sent to your email">
      <div className="space-y-4">
        
        <OTPInput value={otp} onChange={handleOtpChange} />

        <FormError message={error || undefined} />

        {loading && (
          <p className="text-sm text-muted-foreground text-center">
            جاري التحقق...
          </p>
        )}

      </div>
    </AuthCard>
  )
}