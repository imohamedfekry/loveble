'use client'

import { useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { createSchema } from '@/lib/validators/register'
import { createAccount } from '@/lib/api/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AuthCard } from '@/components/auth/auth-card'

export default function CreatePage() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: valibotResolver(createSchema),
  })

  const onSubmit = async (data: any) => {
    try {
      const res = await createAccount(data)
      console.log('createAccount response', res)

      if (res?.success) {
        router.push('/dashboard')
      } else {
        alert(res?.message || 'فشل إنشاء الحساب. حاول مرة أخرى.')
      }
    } catch (error: any) {
      console.error('createAccount error', error)
      alert(error?.message || 'حدث خطأ أثناء إنشاء الحساب.')
    }
  }

  return (
    <AuthCard title="Complete Profile" description="Set up your Squadra account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        <div>
          <Input placeholder="Name" {...register('name')} />
          {errors.name && (
            <p className="text-sm text-destructive">
              {errors.name.message as string}
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
            <p className="text-sm text-destructive">
              {errors.password.message as string}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Create Account
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{' '}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            سجل دخول هنا
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}