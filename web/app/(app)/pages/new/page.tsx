import type { Metadata } from 'next';
import { redirect }    from 'next/navigation';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { PageForm }    from '@/components/forms/PageForm';
import { auth }        from '@/lib/auth/config';

export const metadata: Metadata = { title: 'Add a Page — Kahaniverse' };

export const dynamic = 'force-dynamic';

export default async function NewPagePage() {
  const session = await auth();
  if (!session) redirect('/login?callbackUrl=/pages/new');

  return (
    <NarrowShell title="Add Page">
      <div className="max-w-xl mx-auto py-6 px-2">
        <PageForm />
      </div>
    </NarrowShell>
  );
}
