import type { Metadata } from 'next';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { SlimList }    from '@/components/lists/SlimList';
import { getAuthors }  from '@/lib/db/queries/authors';

export const metadata: Metadata = { title: 'Authors — Kahaniverse' };
export const revalidate = 120;

export default async function AuthorsPage() {
  const { data: authors } = await getAuthors({ page: 1, limit: 40 });

  return (
    <NarrowShell>
      <div className="max-w-xl mx-auto py-6">
        <h1 className="font-serif text-2xl font-bold text-text-primary mb-6">Authors</h1>
        <SlimList authors={authors} />
      </div>
    </NarrowShell>
  );
}
