import type { Metadata } from 'next';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { FormDialog }  from '@/components/shell/FormDialog';
import { StoryForm }   from '@/components/forms/StoryForm';

export const metadata: Metadata = { title: 'Write a Story — Kahaniverse' };

// Auth-gated form page; its client <StoryForm> reads ?universeId via
// useSearchParams. Render dynamically so that search-params CSR bailout never
// fails the static build (and don't rely on fragile dynamic inference).
export const dynamic = 'force-dynamic';

export default function NewStoryPage() {
  return (
    <>
      {/* Horizontal (tablet + desktop): modal dialog, no bottom nav. */}
      <div className="hidden md:block">
        <FormDialog title="Add Story">
          <StoryForm />
        </FormDialog>
      </div>

      {/* Narrow (mobile): full-screen shell with bottom nav. */}
      <div className="block md:hidden">
        <NarrowShell title="Add Story">
          <div className="max-w-xl mx-auto py-6 px-2">
            <StoryForm />
          </div>
        </NarrowShell>
      </div>
    </>
  );
}
