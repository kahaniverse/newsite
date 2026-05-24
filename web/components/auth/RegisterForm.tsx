'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SocialAuthButtons } from './SocialAuthButtons';
import { TurnstileWidget } from './TurnstileWidget';

const schema = z.object({
  displayName: z.string().min(2, 'Min 2 chars').max(64, 'Max 64 chars'),
  email:       z.string().email('Invalid email'),
  password:    z.string().min(8, 'Min 8 characters'),
  confirm:     z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
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
    const res = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        displayName:  data.displayName,
        email:        data.email,
        password:     data.password,
        captchaToken: captchaToken ?? '',
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setServerErr(json.error ?? 'Registration failed. Try again.');
      return;
    }
    // Auto-login after register
    await signIn('credentials', {
      email: data.email, password: data.password,
      captchaToken: captchaToken ?? '',
      redirect: false,
    });
    router.push('/');
    router.refresh();
  }

  return (
    <form className="auth-form flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="field-group flex flex-col gap-1">
        <label className="field-label text-xs font-medium text-text-muted" htmlFor="signupName">Pen Name</label>
        <input
          className="field-input w-full bg-bg-elevated border border-border rounded-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          id="signupName" type="text" autoComplete="name"
          placeholder="Your author name" {...register('displayName')}
        />
        {errors.displayName && <span className="text-xs text-error">{errors.displayName.message}</span>}
      </div>

      <div className="field-group flex flex-col gap-1">
        <label className="field-label text-xs font-medium text-text-muted" htmlFor="signupEmail">Email</label>
        <input
          className="field-input w-full bg-bg-elevated border border-border rounded-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          id="signupEmail" type="email" autoComplete="email"
          placeholder="your@email.com" {...register('email')}
        />
        {errors.email && <span className="text-xs text-error">{errors.email.message}</span>}
      </div>

      <div className="field-group flex flex-col gap-1">
        <label className="field-label text-xs font-medium text-text-muted" htmlFor="signupPassword">Password</label>
        <input
          className="field-input w-full bg-bg-elevated border border-border rounded-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          id="signupPassword" type="password" autoComplete="new-password"
          placeholder="Min. 8 characters" {...register('password')}
        />
        {errors.password && <span className="text-xs text-error">{errors.password.message}</span>}
      </div>

      <div className="field-group flex flex-col gap-1">
        <label className="field-label text-xs font-medium text-text-muted" htmlFor="signupConfirm">Confirm Password</label>
        <input
          className="field-input w-full bg-bg-elevated border border-border rounded-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          id="signupConfirm" type="password" autoComplete="new-password"
          placeholder="Re-enter password" {...register('confirm')}
        />
        {errors.confirm && <span className="text-xs text-error">{errors.confirm.message}</span>}
      </div>

      <TurnstileWidget onToken={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

      {serverErr && <p className="text-xs text-error">{serverErr}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="auth-cta w-full bg-accent hover:bg-accent-light text-white font-semibold py-2.5 rounded-btn text-sm transition-colors disabled:opacity-60"
      >
        {isSubmitting ? 'Creating account…' : 'Begin Your Story →'}
      </button>

      <div className="auth-divider flex items-center gap-3 text-text-muted text-xs">
        <span className="flex-1 border-t border-border" />
        <span>or</span>
        <span className="flex-1 border-t border-border" />
      </div>

      <SocialAuthButtons callbackUrl="/" />

      <p className="text-center text-xs text-text-muted">
        By joining you agree to our{' '}
        <Link href="/terms" className="hover:text-accent">Terms</Link> &amp;{' '}
        <Link href="/privacy" className="hover:text-accent">Privacy Policy</Link>.
      </p>
    </form>
  );
}
