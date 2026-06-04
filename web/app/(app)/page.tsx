import { WideShell }   from '@/components/shell/WideShell';
import { MediumShell } from '@/components/shell/MediumShell';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { BrowsePanel }       from '@/components/panels/BrowsePanel';
import { EntityDetailPanel } from '@/components/panels/EntityDetailPanel';
import { LeafPanel }         from '@/components/panels/LeafPanel';
import { auth }              from '@/lib/auth/config';
import { getUniverses }      from '@/lib/db/queries/universes';

export const revalidate = 300;

// Unauthenticated visitors are rewritten to /index.html by middleware,
// so this page only renders for signed-in users.
export default async function HomePage() {
  const [session, { data: universes }] = await Promise.all([
    auth(),
    getUniverses({ page: 1, limit: 5 }),
  ]);

  return (
    <>
      {/* Wide layout (≥1024px) */}
      <div className="hidden lg:block h-screen">
        <WideShell session={session}>
          {[
            <BrowsePanel key="browse" initialUniverses={universes} heroBleed />,
            <EntityDetailPanel key="detail" />,
            <LeafPanel key="leaf" />,
          ]}
        </WideShell>
      </div>

      {/* Medium layout (768–1023px) */}
      <div className="hidden md:block lg:hidden h-screen">
        <MediumShell session={session}>
          {[
            <BrowsePanel key="browse" initialUniverses={universes} heroBleed />,
            <EntityDetailPanel key="detail" />,
          ]}
        </MediumShell>
      </div>

      {/* Narrow layout (<768px) */}
      <div className="block md:hidden">
        <NarrowShell session={session}>
          <BrowsePanel initialUniverses={universes} heroBleed />
        </NarrowShell>
      </div>
    </>
  );
}
