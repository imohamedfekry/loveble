'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FaGithub } from 'react-icons/fa'
import {
  ArrowRightIcon,
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  LockKeyholeIcon,
  MailIcon,
  RocketIcon,
  SparklesIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react'

import { Input } from '@loveble/ui/input'
import { Button } from '@loveble/ui/button'
import { Label } from '@loveble/ui/label'
import { loginSchema, LoginSchema } from '@loveble/validation/login'
import { loginUser } from '@/lib/api/apis'
import { redirectToGithubConnect } from '@/lib/api/apis/auth'

const FEATURES = [
  {
    icon: ZapIcon,
    title: 'AI-assisted development',
    body: 'Describe the idea — loveble helps you build it.',
  },
  {
    icon: UsersIcon,
    title: 'Real-time collaboration',
    body: 'Edit together with live cursors and presence.',
  },
  {
    icon: RocketIcon,
    title: 'One-click deploy',
    body: 'Ship without config, without the boilerplate.',
  },
]

const ENTRANCE = {
  animation: 'fade-rise 600ms cubic-bezier(0.22, 1, 0.36, 1) both',
}

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: valibotResolver(loginSchema),
  })

  const onSubmit = async (data: LoginSchema) => {
    setFormError(null)
    try {
      const res = await loginUser(data)

      if (res?.success) {
        router.push('/dashboard')
      } else {
        throw new Error(res?.message || 'Sign-in failed')
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : (err as { message?: string } | null)?.message
      setFormError(message || 'Unable to sign in. Check your connection and try again.')
    }
  }

  return (
    <main className="relative min-h-screen bg-background">
      <style>{`
        @keyframes fade-rise {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(18px, -16px) scale(1.1); }
        }
      `}</style>

      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        {/* ── Brand panel ─────────────────────────────────────────── */}
        <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
          {/* Atmosphere */}
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute -top-24 -left-24 size-[28rem] rounded-full opacity-25 blur-3xl"
              style={{ background: '#4b73ff', animation: 'glow-drift 9s ease-in-out infinite' }}
            />
            <div
              className="absolute right-[-6rem] bottom-[-8rem] size-[26rem] rounded-full opacity-20 blur-3xl"
              style={{ background: '#ff66f4', animation: 'glow-drift 11s ease-in-out infinite reverse' }}
            />
            <div
              className="absolute top-1/2 left-1/2 size-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.16] blur-3xl"
              style={{ background: '#82bcff', animation: 'glow-drift 13s ease-in-out infinite' }}
            />
            {/* Fine grain */}
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
              }}
            />
          </div>

          {/* Wordmark */}
          <div
            className="relative z-10 flex items-center gap-3"
            style={{ ...ENTRANCE, animationDelay: '0ms' }}
          >
            <Image
              src="/logo.svg"
              alt="loveble"
              width={40}
              height={40}
              loading="eager"
              className="size-10 rounded-xl outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
            />
            <span className="font-sans text-xl font-semibold tracking-tight">
              loveble
            </span>
          </div>

          {/* Headline */}
          <div className="relative z-10 max-w-md space-y-6">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-ring/20 bg-ring/10 px-3 py-1 text-xs font-medium tracking-wide text-primary"
              style={{ ...ENTRANCE, animationDelay: '90ms' }}
            >
              <SparklesIcon className="size-3.5" />
              AI-powered app workspace
            </span>

            <h1
              className="text-5xl leading-[1.06] font-semibold tracking-tight text-balance"
              style={{ ...ENTRANCE, animationDelay: '160ms' }}
            >
              Build your{' '}
              <span className="text-primary-pulse">vibe</span> projects
              faster.
            </h1>

            <p
              className="text-lg leading-relaxed text-muted-foreground"
              style={{ ...ENTRANCE, animationDelay: '230ms' }}
            >
              A minimal workspace to create, manage and deploy your ideas —
              without the setup. Log in to pick up right where you left off.
            </p>

            <ul
              className="space-y-4 pt-2"
              style={{ ...ENTRANCE, animationDelay: '300ms' }}
            >
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background/60 text-primary shadow-sm">
                    <Icon className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-sm text-muted-foreground">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p
            className="relative z-10 text-xs tracking-wide text-muted-foreground"
            style={{ ...ENTRANCE, animationDelay: '380ms' }}
          >
            loveble — build at the speed of thought.
          </p>
        </aside>

        {/* ── Form panel ─────────────────────────────────────────── */}
        <section className="flex min-h-screen flex-col items-center justify-center px-6 py-12 lg:min-h-0 lg:py-0 lg:pr-16">
          <div className="w-full max-w-sm space-y-8">
            {/* Mobile wordmark */}
            <div
              className="flex items-center justify-center gap-2.5 lg:hidden"
              style={{ ...ENTRANCE }}
            >
              <Image
                src="/logo.svg"
                alt="loveble"
                width={40}
                height={40}
                className="size-9 rounded-xl outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
              />
              <span className="font-sans text-3xl font-semibold tracking-tight">loveble</span>
            </div>

            <div className="space-y-2 text-center lg:text-left" style={{ ...ENTRANCE, animationDelay: '90ms' }}>
              <h2 className="font-heading text-3xl font-semibold tracking-tight">
                Welcome back
              </h2>
              <p className="text-sm text-muted-foreground">
                Log in to continue building.
              </p>
            </div>

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
                style={{ ...ENTRANCE, animationDelay: '120ms' }}
              >
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              style={{ ...ENTRANCE, animationDelay: '160ms' }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="h-11 pl-9"
                    aria-invalid={!!errors.email}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <LockKeyholeIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 pr-10 pl-9"
                    aria-invalid={!!errors.password}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                variant="default"
                className="h-11 w-full gap-2 text-[0.95rem]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <ArrowRightIcon className="size-4" />
                )}
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <div
              className="flex items-center gap-3 text-xs tracking-wide text-muted-foreground"
              style={{ ...ENTRANCE, animationDelay: '220ms' }}
            >
              <span className="h-px flex-1 bg-border" />
              or continue with
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-full gap-2"
              onClick={redirectToGithubConnect}
              style={{ ...ENTRANCE, animationDelay: '260ms' }}
            >
              <FaGithub className="size-4" />
              Sign in with GitHub
            </Button>

            <p
              className="text-center text-sm text-muted-foreground"
              style={{ ...ENTRANCE, animationDelay: '300ms' }}
            >
              New to loveble?{' '}
              <Link
                href="/register"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}