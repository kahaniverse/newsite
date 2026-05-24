import { WideShell }   from '@/components/shell/WideShell';
import { MediumShell } from '@/components/shell/MediumShell';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { BrowsePanel }       from '@/components/panels/BrowsePanel';
import { EntityDetailPanel } from '@/components/panels/EntityDetailPanel';
import { LeafPanel }         from '@/components/panels/LeafPanel';
import { AuthCard }          from '@/components/auth/AuthCard';
import { HeroCarousel }      from '@/components/lists/HeroCarousel';
import { auth }              from '@/lib/auth/config';
import { getUniverses, getUniverseCount } from '@/lib/db/queries/universes';

export const revalidate = 300;

export default async function HomePage() {
  const [session, { data: universes }, universeCount] = await Promise.all([
    auth(),
    getUniverses({ page: 1, limit: 5 }),
    getUniverseCount(),
  ]);

  return (
    <>
      {/* Wide layout (≥1024px) */}
      <div className="hidden lg:block h-screen">
        <WideShell session={session}>
          {[
            <BrowsePanel key="browse" initialUniverses={universes} />,
            <EntityDetailPanel key="detail" />,
            <LeafPanel key="leaf" />,
          ]}
        </WideShell>
      </div>

      {/* Medium layout (768–1023px) */}
      <div className="hidden md:block lg:hidden h-screen">
        <MediumShell session={session}>
          {[
            <BrowsePanel key="browse" initialUniverses={universes} />,
            <EntityDetailPanel key="detail" />,
          ]}
        </MediumShell>
      </div>

      {/* Narrow layout (<768px) — signed-in users see the browse panel, others see the landing card */}
      <div className="block md:hidden">
        <NarrowShell session={session}>
          {session ? (
            <BrowsePanel initialUniverses={universes} />
          ) : (
            <div className="flex flex-col gap-8">
              <section aria-label="Story universes">
                <h1 className="font-serif text-2xl font-bold text-text-primary mb-4">
                  Read. Write. <em>Collaborate.</em><br />Get Discovered.
                </h1>
                <HeroCarousel initialUniverses={universes} />
              </section>
              <section aria-label="Sign in or create account">
                <AuthCard universeCount={universeCount} />
              </section>
            </div>
          )}
        </NarrowShell>
      </div>
    </>
  );
}
