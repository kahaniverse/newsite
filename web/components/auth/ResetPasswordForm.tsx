'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

const schema = z.object({
  password: z.string().min(8, 'Min 8 characters'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

type FormData = z.infer<typeof schema>;

interface Props { token: string }

export function ResetPasswordForm({ token }: Props) {
  const router = useRouter();
  const [serverErr, setServerErr] = useState('');
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setServerErr('');
    const res = await fetch('/api/auth/reset-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, password: data.password }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setServerErr(json.error ?? 'Reset failed. Request a new link.');
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/login'), 1500);
  }

  if (done) {
    return (
      <p className="text-sm text-text-primary">Password updated. Redirecting to sign in…</p>
    );
  }

  return (
    <form className="auth-form flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="field-group flex flex-col gap-1">
        <label className="field-label text-xs font-medium text-text-muted" htmlFor="resetPassword">New Password</label>
        <input
          className="field-input w-full bg-bg-elevated border border-border rounded-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          id="resetPassword" type="password" autoComplete="new-password"
          placeholder="Min. 8 characters" {...register('password')}
        />
        {errors.password && <span className="text-xs text-error">{errors.password.message}</span>}
      </div>

      <div className="field-group flex flex-col gap-1">
        <label className="field-label text-xs font-medium text-text-muted" htmlFor="resetConfirm">Confirm</label>
        <input
          className="field-input w-full bg-bg-elevated border border-border rounded-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          id="resetConfirm" type="password" autoComplete="new-password"
          placeholder="Re-enter password" {...register('confirm')}
        />
        {errors.confirm && <span className="text-xs text-error">{errors.confirm.message}</span>}
      </div>

      {serverErr && <p className="text-xs text-error">{serverErr}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="auth-cta w-full bg-accent hover:bg-accent-light text-white font-semibold py-2.5 rounded-btn text-sm transition-colors disabled:opacity-60"
      >
        {isSubmitting ? 'Updating…' : 'Update Password'}
      </button>
    </form>
  );
}
