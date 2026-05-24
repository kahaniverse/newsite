'use client';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { GENRE_LABELS, type Genre } from '@/lib/types';

const ALL_GENRES = Object.keys(GENRE_LABELS) as Genre[];

const schema = z.object({
  title:      z.string().min(1, 'Required').max(128, 'Max 128 chars'),
  synopsis:   z.string().min(1, 'Required').max(500, 'Max 500 chars'),
  coverImage: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  genreTags:  z.array(z.string()),
});
type FormData = z.infer<typeof schema>;

export function StoryForm() {
  const router      = useRouter();
  const params      = useSearchParams();
  const universeId  = params.get('universeId') ?? '';
  const [serverErr, setServerErr] = useState('');

  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { genreTags: [] },
  });

  const synopsis = watch('synopsis', '');

  async function onSubmit(data: FormData) {
    if (!universeId) { setServerErr('Universe ID missing from URL.'); return; }
    setServerErr('');
    const res = await fetch('/api/stories', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...data, universeId, coverImage: data.coverImage || undefined }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setServerErr(json.error ?? 'Failed to create story.');
      return;
    }
    const story = await res.json();
    router.push(`/stories/${story.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 max-w-xl" noValidate>
      <h1 className="font-serif text-2xl font-bold text-text-primary">Write a Story</h1>

      <Field label="Title *" error={errors.title?.message}>
        <input {...register('title')} placeholder="Your story title" className={inputCls} maxLength={128} />
      </Field>

      <Field label={`Synopsis * (${synopsis.length}/500)`} error={errors.synopsis?.message}>
        <textarea {...register('synopsis')} placeholder="What happens in this story?" className={`${inputCls} h-28 resize-none`} maxLength={500} />
      </Field>

      <Field label="Cover Image URL" error={errors.coverImage?.message}>
        <input {...register('coverImage')} placeholder="https://… (optional)" className={inputCls} type="url" />
      </Field>

      <Field label="Genre Tags" error={errors.genreTags?.message}>
        <Controller
          name="genreTags"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {ALL_GENRES.map(g => {
                const selected = (field.value as string[]).includes(g);
                return (
                  <button key={g} type="button"
                    onClick={() => {
                      const next = selected
                        ? (field.value as string[]).filter(v => v !== g)
                        : [...(field.value as string[]), g];
                      field.onChange(next);
                    }}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${selected ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent hover:text-accent'}`}
                    aria-pressed={selected}
                  >
                    {GENRE_LABELS[g]}
                  </button>
                );
              })}
            </div>
          )}
        />
      </Field>

      {serverErr && <p className="text-sm text-error">{serverErr}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting}
          className="bg-accent hover:bg-accent-light text-white font-semibold py-2.5 px-6 rounded-btn text-sm transition-colors disabled:opacity-60">
          {isSubmitting ? 'Creating…' : 'Create Story'}
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
