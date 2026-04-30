'use client'

import { useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
      console.log('SUBMIT', data)
      const res = await loginUser(data)
      console.log('RESPONSE', res)

      if (res?.success) {
        router.push('/dashboard')
      } else {
        throw new Error(res?.message || 'Login failed')
      }
    } catch (err: any) {
      console.error('ERROR', err)
      alert(err?.message || 'حدث خطأ أثناء تسجيل الدخول. تأكد من الاتصال بالخادم.')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-100">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div>
              <Input placeholder="Email" {...register('email')} />
              {errors.email && (
                <p className="text-red-500 text-sm">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Input
                type="password"
                placeholder="Password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-red-500 text-sm">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Login
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              ليس لديك حساب؟{' '}
              <Link href="/register" className="text-primary underline">
                أنشئ حساباً هنا
              </Link>
            </p>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}