'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
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

  const error = serverErr || errors.email?.message || errors.password?.message;

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="field-group">
        <label className="field-label" htmlFor="loginEmail">Email</label>
        <input
          className="field-input"
          id="loginEmail" type="email" autoComplete="email"
          placeholder="your@email.com" {...register('email')}
        />
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="loginPassword">Password</label>
        <input
          className="field-input"
          id="loginPassword" type="password" autoComplete="current-password"
          placeholder="••••••••" {...register('password')}
        />
      </div>

      <TurnstileWidget onToken={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

      {error && <p className="auth-error" role="alert">{error}</p>}

      <button type="submit" disabled={isSubmitting} className="auth-cta">
        {isSubmitting ? 'Signing in…' : 'Enter the Universe →'}
      </button>

      <div className="auth-divider"><span>or</span></div>

      <SocialAuthButtons callbackUrl={callbackUrl} />
    </form>
  );
}
