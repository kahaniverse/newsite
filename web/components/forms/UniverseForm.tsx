'use client';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { GENRE_LABELS, type Genre } from '@/lib/types';
import { AttestDialog } from './AttestDialog';
import { ImageUpload } from './ImageUpload';

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
  const [pending, setPending] = useState<FormData | null>(null);
  const [busy, setBusy] = useState(false);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { genres: [] },
  });

  const cover = watch('coverImage');

  async function create(data: FormData) {
    setBusy(true);
    setServerErr('');
    const res = await fetch('/api/universes', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setServerErr(json.error ?? 'Failed to create universe.');
      setBusy(false); setPending(null);
      return;
    }
    const universe = await res.json();
    router.push(`/universes/${universe.slug}`);
  }

  return (
    <>
      <form onSubmit={handleSubmit(d => setPending(d))} className="paper-card overflow-hidden" noValidate>
        <CoverPreview
          src={cover}
          hint="Tap “Add image” to upload a cover"
          onUpload={url => setValue('coverImage', url, { shouldValidate: true })}
        />

        <div className="p-4 space-y-4">
          <input
            {...register('name')}
            placeholder="Short Name"
            maxLength={64}
            className="w-full bg-transparent font-serif text-2xl font-bold text-paper-ink placeholder:text-paper-muted/60 focus:outline-none"
          />
          {errors.name && <Err>{errors.name.message}</Err>}

          <textarea
            {...register('concept')}
            placeholder="Mention the concept of this universe in few words"
            maxLength={2000}
            className={`${inputCls} h-28 resize-none italic`}
          />
          {errors.concept && <Err>{errors.concept.message}</Err>}

          <div className="grid grid-cols-2 gap-3">
            <input {...register('era')}   placeholder="Era (any time)"     className={inputCls} maxLength={64} />
            <input {...register('world')} placeholder="World (any place)"  className={inputCls} maxLength={64} />
          </div>

          <input type="hidden" {...register('coverImage')} />
          {errors.coverImage && <Err>{errors.coverImage.message}</Err>}

          <Controller
            name="genres"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {ALL_GENRES.map(g => <GenrePill key={g} g={g} field={field} />)}
              </div>
            )}
          />
          {errors.genres && <Err>{errors.genres.message}</Err>}

          {serverErr && <p className="text-sm text-error">{serverErr}</p>}

          <Actions onCancel={() => router.back()} label="Create" />
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

// ── Shared editable-card pieces (also imported by Story/Page forms) ───────
export const inputCls =
  'w-full bg-white border border-black/10 rounded-md px-3 py-2 text-sm text-paper-ink placeholder:text-paper-muted focus:outline-none focus:border-accent-deep';

export function Err({ children }: { children?: React.ReactNode }) {
  return <span className="text-xs text-error">{children}</span>;
}

export function CoverPreview({ src, hint, onUpload }: { src?: string; hint: string; onUpload?: (url: string) => void }) {
  const valid = src && /^https?:\/\//.test(src);
  return (
    <div className="relative w-full aspect-[16/9] bg-bg-elevated">
      {valid ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Cover preview" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-text-muted">
          <span className="text-3xl" aria-hidden>🖼️</span>
          <span className="text-xs">{hint}</span>
        </div>
      )}
      {onUpload && (
        <div className="absolute bottom-2 right-2">
          <ImageUpload onUploaded={onUpload} label={valid ? 'Change image' : 'Add image'} />
        </div>
      )}
    </div>
  );
}

export function Actions({ onCancel, label, busy }: { onCancel: () => void; label: string; busy?: boolean }) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 inline-flex items-center justify-center h-11 px-4 rounded-full border border-paper-border text-paper-ink font-medium text-sm hover:border-accent-deep hover:text-accent-deep transition-colors"
      >
        Revert
      </button>
      <button type="submit" disabled={busy} data-testid="form-submit" className="flex-1 btn-pill btn-pill-primary !text-sm disabled:opacity-60">
        {label}
      </button>
    </div>
  );
}

export function GenrePill({ g, field }: { g: Genre; field: { value: string[]; onChange: (v: string[]) => void } }) {
  const selected = field.value.includes(g);
  return (
    <button
      type="button"
      onClick={() => field.onChange(selected ? field.value.filter(v => v !== g) : [...field.value, g])}
      aria-pressed={selected}
      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
        selected
          ? 'bg-accent-deep text-white border-accent-deep'
          : 'border-black/15 text-paper-muted hover:border-accent-deep hover:text-accent-deep'
      }`}
    >
      {GENRE_LABELS[g]}
    </button>
  );
}
