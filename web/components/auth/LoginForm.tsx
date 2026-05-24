'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SocialAuthButtons } from './SocialAuthButtons';
import { TurnstileWidget } from './TurnstileWidget';

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Required'),
});
type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const router      = useRouter();
  const params      = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/';
  const [serverErr, setServerErr] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setServerErr('');
    if (turnstileRequired && !captchaToken) {
      setServerErr('Please complete the CAPTCHA.');
      return;
    }
    const res = await signIn('credentials', {
      email: data.email, password: data.password,
      captchaToken: captchaToken ?? '',
      redirect: false, callbackUrl,
    });
    if (res?.error) {
      setServerErr('Incorrect email or password.');
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form className="auth-form flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="field-group flex flex-col gap-1">
        <label className="field-label text-xs font-medium text-text-muted" htmlFor="loginEmail">Email</label>
        <input
          className="field-input w-full bg-bg-elevated border border-border rounded-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          id="loginEmail" type="email" autoComplete="email"
          placeholder="your@email.com" {...register('email')}
        />
        {errors.email && <span className="text-xs text-error">{errors.email.message}</span>}
      </div>

      <div className="field-group flex flex-col gap-1">
        <label className="field-label text-xs font-medium text-text-muted" htmlFor="loginPassword">Password</label>
        <input
          className="field-input w-full bg-bg-elevated border border-border rounded-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          id="loginPassword" type="password" autoComplete="current-password"
          placeholder="••••••••" {...register('password')}
        />
        {errors.password && <span className="text-xs text-error">{errors.password.message}</span>}
      </div>

      <TurnstileWidget onToken={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

      {serverErr && <p className="text-xs text-error">{serverErr}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="auth-cta w-full bg-accent hover:bg-accent-light text-white font-semibold py-2.5 rounded-btn text-sm transition-colors disabled:opacity-60"
      >
        {isSubmitting ? 'Signing in…' : 'Enter the Universe →'}
      </button>

      <div className="auth-divider flex items-center gap-3 text-text-muted text-xs">
        <span className="flex-1 border-t border-border" />
        <span>or</span>
        <span className="flex-1 border-t border-border" />
      </div>

      <SocialAuthButtons callbackUrl={callbackUrl} />

      <p className="text-center text-xs text-text-muted">
        <Link href="/forgot-password" className="hover:text-accent transition-colors">Forgot password?</Link>
      </p>
    </form>
  );
}
