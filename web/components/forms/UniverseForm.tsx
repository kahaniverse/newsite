'use client';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { GENRE_LABELS, type Genre } from '@/lib/types';

const ALL_GENRES = Object.keys(GENRE_LABELS) as Genre[];

const schema = z.object({
  name:       z.string().min(1, 'Required').max(64, 'Max 64 chars'),
  concept:    z.string().min(1, 'Required').max(2000, 'Max 2000 chars'),
  coverImage: z.string().url('Must be a valid URL'),
  era:        z.string().max(64).optional(),
  world:      z.string().max(64).optional(),
  genres:     z.array(z.string()).min(1, 'Select at least one genre'),
});
type FormData = z.infer<typeof schema>;

export function UniverseForm() {
  const router = useRouter();
  const [serverErr, setServerErr] = useState('');

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { genres: [] },
  });

  async function onSubmit(data: FormData) {
    setServerErr('');
    const res = await fetch('/api/universes', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setServerErr(json.error ?? 'Failed to create universe.');
      return;
    }
    const universe = await res.json();
    router.push(`/universes/${universe.slug}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 max-w-xl" noValidate>
      <h1 className="font-serif text-2xl font-bold text-text-primary">Create a Universe</h1>

      <Field label="Name *" error={errors.name?.message}>
        <input {...register('name')} placeholder="e.g. The Ember Courts" className={inputCls} maxLength={64} />
      </Field>

      <Field label="Concept / Pitch *" error={errors.concept?.message}>
        <textarea {...register('concept')} placeholder="What is this universe about?" className={`${inputCls} h-32 resize-none`} maxLength={2000} />
      </Field>

      <Field label="Cover Image URL *" error={errors.coverImage?.message}>
        <input {...register('coverImage')} placeholder="https://…" className={inputCls} type="url" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Era" error={errors.era?.message}>
          <input {...register('era')} placeholder="e.g. Far Future" className={inputCls} maxLength={64} />
        </Field>
        <Field label="World / Setting" error={errors.world?.message}>
          <input {...register('world')} placeholder="e.g. New Terra" className={inputCls} maxLength={64} />
        </Field>
      </div>

      <Field label="Genres *" error={errors.genres?.message}>
        <Controller
          name="genres"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {ALL_GENRES.map(g => {
                const selected = (field.value as string[]).includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      const next = selected
                        ? (field.value as string[]).filter(v => v !== g)
                        : [...(field.value as string[]), g];
                      field.onChange(next);
                    }}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      selected
                        ? 'bg-accent text-white border-accent'
                        : 'border-border text-text-muted hover:border-accent hover:text-accent'
                    }`}
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
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent hover:bg-accent-light text-white font-semibold py-2.5 px-6 rounded-btn text-sm transition-colors disabled:opacity-60"
        >
          {isSubmitting ? 'Creating…' : 'Create Universe'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-border text-text-muted hover:text-text-primary py-2.5 px-6 rounded-btn text-sm transition-colors"
        >
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
