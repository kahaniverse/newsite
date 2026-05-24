'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import type { Author } from '@/lib/types';

const schema = z.object({
  displayName: z.string().min(2, 'Min 2 chars').max(64, 'Max 64 chars'),
  bio:         z.string().max(500, 'Max 500 chars').optional(),
  avatarImage: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

interface Props { author: Author }

export function ProfileForm({ author }: Props) {
  const router = useRouter();
  const [serverErr, setServerErr] = useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: author.displayName,
      bio:         author.bio ?? '',
      avatarImage: author.avatarImage ?? '',
    },
  });

  const bio = watch('bio', '');

  async function onSubmit(data: FormData) {
    setServerErr('');
    const res = await fetch(`/api/authors/${author.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...data, avatarImage: data.avatarImage || undefined }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setServerErr(json.error ?? 'Failed to update profile.');
      return;
    }
    router.push('/profile');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 max-w-md" noValidate>
      <h1 className="font-serif text-2xl font-bold text-text-primary">Edit Profile</h1>

      <Field label="Pen Name *" error={errors.displayName?.message}>
        <input {...register('displayName')} className={inputCls} maxLength={64} />
      </Field>

      <Field label={`Bio (${(bio ?? '').length}/500)`} error={errors.bio?.message}>
        <textarea {...register('bio')} className={`${inputCls} h-28 resize-none`} maxLength={500} placeholder="Tell readers about yourself…" />
      </Field>

      <Field label="Avatar URL" error={errors.avatarImage?.message}>
        <input {...register('avatarImage')} className={inputCls} type="url" placeholder="https://… (optional)" />
      </Field>

      {serverErr && <p className="text-sm text-error">{serverErr}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting}
          className="bg-accent hover:bg-accent-light text-white font-semibold py-2.5 px-6 rounded-btn text-sm transition-colors disabled:opacity-60">
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="border border-border text-text-muted hover:text-text-primary py-2.5 px-6 rounded-btn text-sm transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputCls = 'w-full bg-bg-elevated border border-border rounded-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-text-muted">{label}</label>
      {children}
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
