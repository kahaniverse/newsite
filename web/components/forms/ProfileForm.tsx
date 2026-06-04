'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import type { Author } from '@/lib/types';
import { sampleAvatar } from '@/lib/sample-images';
import { inputCls, Err, Actions } from './UniverseForm';
import { ImageUpload } from './ImageUpload';

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
  const [busy, setBusy] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: author.displayName,
      bio:         author.bio ?? '',
      avatarImage: author.avatarImage ?? '',
    },
  });

  const bio    = watch('bio', '');
  const avatar = watch('avatarImage') || author.avatarImage || sampleAvatar(author.id, 240);

  async function onSubmit(data: FormData) {
    setBusy(true);
    setServerErr('');
    const res = await fetch(`/api/authors/${author.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...data, avatarImage: data.avatarImage || undefined }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setServerErr(json.error ?? 'Failed to update profile.');
      setBusy(false);
      return;
    }
    router.push('/profile');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="paper-card p-5 space-y-4" noValidate>
      <div className="flex flex-col items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar} alt="" className="w-24 h-24 rounded-full object-cover ring-4 ring-paper shadow" />
        <ImageUpload
          variant="inline"
          label="Upload / capture photo"
          onUploaded={url => setValue('avatarImage', url, { shouldValidate: true })}
        />
      </div>

      <input
        {...register('displayName')}
        placeholder="Name"
        maxLength={64}
        className="w-full bg-transparent text-center font-serif text-xl font-bold text-paper-ink placeholder:text-paper-muted/60 focus:outline-none"
      />
      {errors.displayName && <Err>{errors.displayName.message}</Err>}

      <textarea
        {...register('bio')}
        placeholder="Tell readers about yourself…"
        maxLength={500}
        className={`${inputCls} h-24 resize-none italic`}
      />
      <div className="flex justify-end -mt-2">
        <span className="text-xs text-paper-muted">{(bio ?? '').length}/500</span>
      </div>

      <input type="hidden" {...register('avatarImage')} />
      {errors.avatarImage && <Err>{errors.avatarImage.message}</Err>}

      {serverErr && <p className="text-sm text-error">{serverErr}</p>}

      <Actions onCancel={() => router.back()} label="Update" busy={busy} />
    </form>
  );
}
