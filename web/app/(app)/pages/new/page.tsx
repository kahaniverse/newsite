import type { Metadata } from 'next';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { PageForm }    from '@/components/forms/PageForm';

export const metadata: Metadata = { title: 'Add a Page — Kahaniverse' };

// Auth-gated form page; its client <PageForm> reads ?storyId/?parentId via
// useSearchParams. Render dynamically so the search-params CSR bailout never
// fails the static build (and don't rely on fragile dynamic inference).
export const dynamic = 'force-dynamic';

export default function NewPagePage() {
  return (
    <NarrowShell title="Add Page">
      <div className="max-w-xl mx-auto py-6 px-2">
        <PageForm />
      </div>
    </NarrowShell>
  );
}
