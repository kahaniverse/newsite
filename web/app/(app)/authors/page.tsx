import type { Metadata } from 'next';
import { NarrowShell }  from '@/components/shell/NarrowShell';
import { HorizontalBrowse } from '@/components/shell/HorizontalBrowse';
import { HydrateSelection } from '@/components/shell/HydrateSelection';
import { SlimList }     from '@/components/lists/SlimList';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getAuthors }   from '@/lib/db/queries/authors';
import { auth }         from '@/lib/auth/config';

export const metadata: Metadata = { title: 'Authors — Kahaniverse' };

export default async function AuthorsPage() {
  // Personalized: exclude the signed-in user from their own follow list.
  const session = await auth();
  const { data: authors } = await getAuthors({ page: 1, limit: 40, exclude: session?.user?.id });

  return (
    <>
      {/* Browse root: clear any focused-takeover hero from a prior route. */}
      <HydrateSelection focus={false} />

      {/* Horizontal cascading panels (tablet + desktop) */}
      <div className="hidden md:block">
        <HorizontalBrowse />
      </div>

      {/* Narrow stacked layout (mobile) */}
      <div className="block md:hidden">
        <NarrowShell title="People">
          <div className="max-w-xl mx-auto py-6">
            <SectionHeader title="Authors" />
            <SlimList authors={authors} />
          </div>
        </NarrowShell>
      </div>
    </>
  );
}
