'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { createSchema, type CreateSchema } from '@loveble/validation/register'
import { createAccount } from '@/lib/api/apis/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { Input } from '@loveble/ui/input'
import { Button } from '@loveble/ui/button'
import { AuthCard } from '@/components/auth/auth-card'
import { FormError } from '@/components/auth/form-error'

export default function CreatePage() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateSchema>({
    resolver: valibotResolver<CreateSchema, unknown, CreateSchema>(createSchema),
  })

  const onSubmit = async (data: CreateSchema) => {
    setFormError(null)

    try {
      const res = await createAccount(data)

      if (res?.success) {
        router.push('/dashboard')
      } else {
        setFormError(res?.message || 'Could not create your account. Please try again.')
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : (error as { message?: string } | null)?.message
      setFormError(message || 'Something went wrong while creating your account.')
    }
  }

  return (
    <AuthCard title="Complete Profile" description="Set up your loveble account">
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

        <FormError message={formError ?? undefined} />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Create Account
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
