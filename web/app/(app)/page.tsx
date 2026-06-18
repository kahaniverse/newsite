import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { redirect }               from 'next/navigation';
import { HorizontalBrowse }   from '@/components/shell/HorizontalBrowse';
import { NarrowShell }        from '@/components/shell/NarrowShell';
import { BrowsePanel }        from '@/components/panels/BrowsePanel';
import { HydrateSelection }   from '@/components/shell/HydrateSelection';
import { auth }               from '@/lib/auth/config';
import { getFeaturedUniverses } from '@/lib/db/queries/universes';
import { getServerQueryClient } from '@/lib/react-query/server';
import { getPersona }          from '@/lib/persona.server';

export const revalidate = 300;

export default async function HomePage() {
  // auth() already reads cookies (dynamic render), so reading the persona cookie
  // here adds no extra rendering cost. Kid persona hides author-rated-mature
  // universes from the home carousel.
  const persona = getPersona();
  const [session, featured] = await Promise.all([
    auth(),
    getFeaturedUniverses(persona),
  ]);

  if (!session) redirect('/index.html');
  const universes = featured.data;

  // Seed React Query with the data we already fetched so client lists keyed on
  // ['universes','featured'] (e.g. MoreUniverses) hydrate without a mount fetch.
  const qc = getServerQueryClient();
  qc.setQueryData(['universes', 'featured'], featured);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      {/* Browse root: start in browse mode (no focused hero in panel 1). */}
      <HydrateSelection focus={false} />

      {/* Horizontal layout — far-left strip + equal cascading panels (tablet + desktop) */}
      <div className="hidden md:block">
        <HorizontalBrowse session={session} initialUniverses={universes} seedCarousel />
      </div>

      {/* Narrow stacked layout (mobile). autoSeed off: both layouts are mounted
          at once (CSS-hidden, not unmounted), and this hidden carousel's seeding
          would otherwise keep overwriting the horizontal layout's chosen universe.
          Narrow has no detail panel to seed anyway — tapping a slide just routes. */}
      <div className="block md:hidden">
        <NarrowShell session={session}>
          <BrowsePanel initialUniverses={universes} heroBleed autoSeed={false} />
        </NarrowShell>
      </div>
    </HydrationBoundary>
  );
}
