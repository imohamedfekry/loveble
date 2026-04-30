'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthCard } from '@/components/auth/auth-card'
import { verifyOtp } from '@/lib/api/auth'
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

  useEffect(() => {
    if (otp.length === 7) {
      handleVerify()
    }
  }, [otp])

  const handleVerify = async () => {
    const result = v.safeParse(otpSchema, { otp })

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

      const res = await verifyOtp(email, otp)

      if (res?.code === 'OTP_VERIFIED') {
        router.push('/register/create')
      } else {
        setError(res?.message || 'OTP غير صحيح')
      }
    } catch (err: any) {
      setError(err?.message || 'حصل خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Verify OTP">
      <div className="space-y-4">
        
        <OTPInput value={otp} onChange={setOtp} />

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