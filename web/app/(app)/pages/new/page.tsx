import type { Metadata } from 'next';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { PageForm }    from '@/components/forms/PageForm';

export const metadata: Metadata = { title: 'Add a Page — Kahaniverse' };

export default function NewPagePage() {
  return (
    <NarrowShell title="Add Page">
      <div className="max-w-xl mx-auto py-6 px-2">
        <PageForm />
      </div>
    </NarrowShell>
  );
}
