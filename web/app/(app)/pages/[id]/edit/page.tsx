import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { PageForm }    from '@/components/forms/PageForm';
import { auth }        from '@/lib/auth/config';
import { getPageById } from '@/lib/db/queries/pages';

export const metadata: Metadata = { title: 'Edit Page — Kahaniverse' };

interface Props { params: { id: string } }

export default async function EditPageRoute({ params }: Props) {
  const [session, page] = await Promise.all([auth(), getPageById(params.id)]);
  if (!page) notFound();
  if (!session) redirect(`/login?callbackUrl=/pages/${params.id}/edit`);
  if (page.author.id !== session.user.id) {
    // Non-author shouldn't edit; bounce back to the page detail.
    redirect(`/pages/${params.id}`);
  }

  return (
    <NarrowShell session={session} title="Edit Page">
      <div className="max-w-xl mx-auto py-6 px-2">
        <PageForm editPageId={page.id} />
      </div>
    </NarrowShell>
  );
}
