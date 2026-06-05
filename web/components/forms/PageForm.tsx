'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { AttestDialog } from './AttestDialog';
import { inputCls, Err, CoverPreview, Actions } from './UniverseForm';

const schema = z.object({
  content:      z.string().min(1, 'Required').max(10000, 'Max 10,000 chars'),
  illustration: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

interface Props { editPageId?: string }

export function PageForm({ editPageId }: Props = {}) {
  const router      = useRouter();
  const params      = useSearchParams();
  const storyId     = params.get('storyId') ?? '';
  const parentId    = params.get('parentId') ?? '';
  const intent      = params.get('intent');
  const isEdit      = !!editPageId;
  const isAlternate = intent === 'alter' || (!intent && !!parentId && parentId !== storyId);
  const [serverErr, setServerErr] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [pending, setPending] = useState<FormData | null>(null);
  const [busy, setBusy] = useState(false);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const content = watch('content', '');
  const illo    = watch('illustration');

  useEffect(() => {
    if (!editPageId) return;
    setLoadingExisting(true);
    fetch(`/api/pages/${editPageId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) reset({ content: d.content, illustration: d.illustration ?? '' }); })
      .finally(() => setLoadingExisting(false));
  }, [editPageId, reset]);

  async function save(data: FormData) {
    setBusy(true);
    setServerErr('');
    const body = { content: data.content, illustration: data.illustration || undefined };

    if (isEdit) {
      const res = await fetch(`/api/pages/${editPageId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setServerErr(j.error ?? 'Failed to save page.'); setBusy(false); return; }
      router.push(`/pages/${editPageId}`);
      return;
    }

    if (!storyId || !parentId) { setServerErr('Story or parent ID missing from URL.'); setBusy(false); setPending(null); return; }
    const res = await fetch('/api/pages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId, parentId, ...body }),
    });
    if (!res.ok) { const j = await res.json().catch(() => ({})); setServerErr(j.error ?? 'Failed to add page.'); setBusy(false); setPending(null); return; }
    const page = await res.json();
    router.push(`/pages/${page.id}`);
  }

  const heading = isEdit ? 'Edit Page' : isAlternate ? 'Add an Alternate Path' : 'Continue the Story';

  return (
    <>
      <form
        onSubmit={handleSubmit(d => (isEdit ? save(d) : setPending(d)))}
        className="paper-card overflow-hidden"
        noValidate
      >
        <CoverPreview
          src={illo}
          hint="Tap “Add image” to add an illustration (optional)"
          onUpload={url => setValue('illustration', url, { shouldValidate: true })}
        />

        <div className="p-4 space-y-4">
          <div>
            <h1 className="font-serif text-xl font-bold text-paper-ink">{heading}</h1>
            {isAlternate && !isEdit && (
              <p className="text-xs text-paper-muted mt-1">
                You are adding an alternate version of this page. Readers will be able to choose between paths.
              </p>
            )}
            {loadingExisting && <p className="text-xs text-paper-muted mt-1">Loading current content…</p>}
          </div>

          <textarea
            {...register('content')}
            data-testid="page-content-input"
            placeholder="Add content for the page…"
            maxLength={10000}
            className={`${inputCls} h-64 resize-none font-serif leading-relaxed`}
          />
          <div className="flex justify-between">
            {errors.content ? <Err>{errors.content.message}</Err> : <span />}
            <span className="text-xs text-paper-muted">{content.length}/10,000</span>
          </div>

          <input type="hidden" {...register('illustration')} />
          {errors.illustration && <Err>{errors.illustration.message}</Err>}

          {serverErr && <p className="text-sm text-error">{serverErr}</p>}

          <Actions onCancel={() => router.back()} label={isEdit ? 'Update' : 'Create'} busy={busy || loadingExisting} />
        </div>
      </form>

      <AttestDialog
        open={!!pending}
        busy={busy}
        onClose={() => !busy && setPending(null)}
        onAnswer={() => pending && save(pending)}
      />
    </>
  );
}
