'use client';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { GENRE_LABELS, type Genre } from '@/lib/types';
import { AttestDialog } from './AttestDialog';
import { inputCls, Err, CoverPreview, Actions, GenrePill } from './UniverseForm';

const ALL_GENRES = Object.keys(GENRE_LABELS) as Genre[];

const schema = z.object({
  title:      z.string().min(1, 'Required').max(128, 'Max 128 chars'),
  synopsis:   z.string().min(1, 'Required').max(500, 'Max 500 chars'),
  coverImage: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  genreTags:  z.array(z.string()),
});
type FormData = z.infer<typeof schema>;

interface Props {
  /** Embedded (third-panel) use overrides the URL search params and the
   *  default navigate-on-success / navigate-on-cancel behaviour. */
  universeId?: string;
  onCancel?:   () => void;
  onCreated?:  (story: { id: string }) => void;
}

export function StoryForm({ universeId: universeIdProp, onCancel, onCreated }: Props = {}) {
  const router      = useRouter();
  const params      = useSearchParams();
  const universeId  = universeIdProp ?? params.get('universeId') ?? '';
  const [serverErr, setServerErr] = useState('');
  const [pending, setPending] = useState<FormData | null>(null);
  const [busy, setBusy] = useState(false);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { genreTags: [] },
  });

  const cover = watch('coverImage');

  async function create(data: FormData) {
    if (!universeId) { setServerErr('Universe ID missing from URL.'); setPending(null); return; }
    setBusy(true);
    setServerErr('');
    const res = await fetch('/api/stories', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...data, universeId, coverImage: data.coverImage || undefined }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setServerErr(json.error ?? 'Failed to create story.');
      setBusy(false); setPending(null);
      return;
    }
    const story = await res.json();
    if (onCreated) onCreated(story);
    else router.push(`/stories/${story.id}`);
  }

  return (
    <>
      <form onSubmit={handleSubmit(d => setPending(d))} className="paper-card overflow-hidden" noValidate>
        <CoverPreview
          src={cover}
          hint="Tap “Add image” to upload a cover (optional)"
          onUpload={url => setValue('coverImage', url, { shouldValidate: true })}
        />

        <div className="p-4 space-y-4">
          <input
            {...register('title')}
            placeholder="Short Name"
            maxLength={128}
            className="w-full bg-transparent font-serif text-2xl font-bold text-paper-ink placeholder:text-paper-muted/60 focus:outline-none"
          />
          {errors.title && <Err>{errors.title.message}</Err>}

          <textarea
            {...register('synopsis')}
            placeholder="Mention the synopsis of this story in few words"
            maxLength={500}
            className={`${inputCls} h-28 resize-none italic`}
          />
          {errors.synopsis && <Err>{errors.synopsis.message}</Err>}

          <input type="hidden" {...register('coverImage')} />
          {errors.coverImage && <Err>{errors.coverImage.message}</Err>}

          <Controller
            name="genreTags"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {ALL_GENRES.map(g => <GenrePill key={g} g={g} field={field} />)}
              </div>
            )}
          />

          {serverErr && <p className="text-sm text-error">{serverErr}</p>}

          <Actions onCancel={onCancel ?? (() => router.back())} label="Create" busy={busy} />
        </div>
      </form>

      <AttestDialog
        open={!!pending}
        busy={busy}
        onClose={() => !busy && setPending(null)}
        onAnswer={() => pending && create(pending)}
      />
    </>
  );
}
