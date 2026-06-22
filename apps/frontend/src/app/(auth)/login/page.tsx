'use client'

import { useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AuthCard } from '@/components/auth/auth-card'
import { loginSchema, LoginSchema } from '@/lib/validators/login'
import { loginUser } from '@/lib/api/user'

export default function LoginPage() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: valibotResolver(loginSchema),
  })

  const onSubmit = async (data: LoginSchema) => {
    try {
      const res = await loginUser(data)

      if (res?.success) {
        router.push('/dashboard')
      } else {
        throw new Error(res?.message || 'Login failed')
      }
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء تسجيل الدخول. تأكد من الاتصال بالخادم.')
    }
  }

  return (
    <AuthCard title="Login" description="Welcome back to Squadra">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input placeholder="Email" {...register('email')} />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Input
            type="password"
            placeholder="Password"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Login
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="text-primary underline-offset-4 hover:underline">
            أنشئ حساباً هنا
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
