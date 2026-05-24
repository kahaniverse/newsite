'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';

const schema = z.object({
  content:      z.string().min(1, 'Required').max(10000, 'Max 10,000 chars'),
  illustration: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

export function PageForm() {
  const router   = useRouter();
  const params   = useSearchParams();
  const storyId  = params.get('storyId') ?? '';
  const parentId = params.get('parentId') ?? '';
  const [serverErr, setServerErr] = useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const content = watch('content', '');
  const isAlternate = !!parentId && parentId !== storyId;

  async function onSubmit(data: FormData) {
    if (!storyId || !parentId) { setServerErr('Story or parent ID missing from URL.'); return; }
    setServerErr('');
    const res = await fetch('/api/pages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ storyId, parentId, content: data.content, illustration: data.illustration || undefined }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setServerErr(json.error ?? 'Failed to add page.');
      return;
    }
    const page = await res.json();
    router.push(`/pages/${page.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 max-w-xl" noValidate>
      <div>
        <h1 className="font-serif text-2xl font-bold text-text-primary">
          {isAlternate ? 'Add an Alternate Path' : 'Continue the Story'}
        </h1>
        {isAlternate && (
          <p className="text-sm text-text-muted mt-1">
            You are adding an alternate version of this page. Readers will be able to choose between paths.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-muted" htmlFor="pageContent">
          Page Content * <span className="text-text-muted font-normal">({content.length}/10,000)</span>
        </label>
        <textarea
          id="pageContent"
          {...register('content')}
          placeholder="Write your page here…"
          className="w-full bg-bg-elevated border border-border rounded-input px-3 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent h-64 resize-none font-serif leading-relaxed"
          maxLength={10000}
        />
        {errors.content && <span className="text-xs text-error">{errors.content.message}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-muted" htmlFor="pageIllustration">Illustration URL (optional)</label>
        <input
          id="pageIllustration"
          {...register('illustration')}
          placeholder="https://… image URL"
          className="w-full bg-bg-elevated border border-border rounded-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          type="url"
        />
        {errors.illustration && <span className="text-xs text-error">{errors.illustration.message}</span>}
      </div>

      {serverErr && <p className="text-sm text-error">{serverErr}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting}
          className="bg-accent hover:bg-accent-light text-white font-semibold py-2.5 px-6 rounded-btn text-sm transition-colors disabled:opacity-60">
          {isSubmitting ? 'Publishing…' : 'Publish Page'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="border border-border text-text-muted hover:text-text-primary py-2.5 px-6 rounded-btn text-sm transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
