'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SocialAuthButtons } from './SocialAuthButtons';
import { TurnstileWidget } from './TurnstileWidget';
import { generatePenName } from '@/lib/penname';

const schema = z.object({
  displayName: z.string().min(2, 'Min 2 chars').max(64, 'Max 64 chars'),
  email:       z.string().email('Invalid email'),
  password:    z.string().min(8, 'Min 8 characters'),
  confirm:     z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const router      = useRouter();
  const params      = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/';
  const [serverErr, setServerErr] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Seed an editable pen name so the user never has to reveal a real name —
  // generated once on mount (useState initializer) so it's stable across renders.
  const [defaultName] = useState(generatePenName);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: defaultName },
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
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerErr(json.error ?? 'Registration failed. Try again.');
      return;
    }
    // Use the one-time grant from registration, NOT the captcha token — Turnstile
    // tokens are single-use and the one above was already spent by /register, so
    // reusing it would make this auto-login fail (and force a manual login).
    await signIn('credentials', {
      email: data.email, password: data.password,
      signinToken: json.signinToken ?? '',
      redirect: false,
    });
    router.push(callbackUrl);
    router.refresh();
  }

  const error = serverErr ||
    errors.displayName?.message ||
    errors.email?.message ||
    errors.password?.message ||
    errors.confirm?.message;

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="field-group">
        <label className="field-label" htmlFor="signupName">Pen Name</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className="field-input"
            id="signupName" type="text" autoComplete="off"
            placeholder="Your author name" {...register('displayName')}
          />
          <button
            type="button" className="social-btn" title="Shuffle"
            aria-label="Suggest another pen name"
            onClick={() => setValue('displayName', generatePenName(), { shouldValidate: true })}
          >🎲</button>
        </div>
        <p className="auth-footer-text">Your real name is never required or shown.</p>
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="signupEmail">Email</label>
        <input
          className="field-input"
          id="signupEmail" type="email" autoComplete="email"
          placeholder="your@email.com" {...register('email')}
        />
        <p className="auth-footer-text">
          The one personal thing we ask for — use any address you&apos;re happy to share. Prefer none?
          Create an anonymous account below.
        </p>
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="signupPassword">Password</label>
        <input
          className="field-input"
          id="signupPassword" type="password" autoComplete="new-password"
          placeholder="Min. 8 characters" {...register('password')}
        />
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="signupConfirm">Confirm Password</label>
        <input
          className="field-input"
          id="signupConfirm" type="password" autoComplete="new-password"
          placeholder="Re-enter password" {...register('confirm')}
        />
      </div>

      <TurnstileWidget onToken={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

      {error && <p className="auth-error" role="alert">{error}</p>}

      <button type="submit" disabled={isSubmitting} className="auth-cta">
        {isSubmitting ? 'Creating account…' : 'Begin Your Story →'}
      </button>

      <div className="auth-divider"><span>or</span></div>

      <SocialAuthButtons callbackUrl={callbackUrl} />
    </form>
  );
}
