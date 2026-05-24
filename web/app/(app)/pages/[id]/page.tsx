import type { Metadata } from 'next';
import { notFound }    from 'next/navigation';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { PageCard }    from '@/components/cards/PageCard';
import { PageList }    from '@/components/lists/PageList';
import { getPageById } from '@/lib/db/queries/pages';

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPageById(params.id);
  if (!p) return {};
  return { title: 'Story Page — Kahaniverse', description: p.content.slice(0, 160) };
}

export default async function PageDetailPage({ params }: Props) {
  const page = await getPageById(params.id);
  if (!page) notFound();

  return (
    <NarrowShell>
      <div className="flex flex-col gap-5 py-4">
        <PageCard page={page} />
        {page.children.length > 0 && (
          <PageList pages={page.children} onSelect={() => {}} />
        )}
      </div>
    </NarrowShell>
  );
}
