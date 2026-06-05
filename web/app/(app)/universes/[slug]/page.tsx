import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NarrowShell }    from '@/components/shell/NarrowShell';
import { HorizontalBrowse } from '@/components/shell/HorizontalBrowse';
import { CompositeScreen } from '@/components/screens/CompositeScreen';
import { HeroBlock }      from '@/components/screens/HeroBlock';
import { StoryList }      from '@/components/lists/StoryList';
import { Fab }            from '@/components/shell/Fab';
import { HydrateSelection } from '@/components/shell/HydrateSelection';
import { getUniverseBySlug } from '@/lib/db/queries/universes';
import { GENRE_LABELS } from '@/lib/types';

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const u = await getUniverseBySlug(params.slug);
  if (!u) return {};
  return {
    title:       `${u.name} — Kahaniverse`,
    description: u.concept.slice(0, 160),
    openGraph:   { title: u.name, description: u.concept.slice(0, 160), images: [u.coverImage] },
  };
}

export default async function UniversePage({ params }: Props) {
  const universe = await getUniverseBySlug(params.slug);
  if (!universe) notFound();

  return (
    <>
      {/* Pre-select this universe so the horizontal panels reflect the route. */}
      <HydrateSelection universeSlug={universe.slug} universeId={universe.id} />

      {/* Horizontal cascading panels (tablet + desktop) */}
      <div className="hidden md:block">
        <HorizontalBrowse />
      </div>

      {/* Narrow stacked layout (mobile) */}
      <div className="block md:hidden">
      <NarrowShell title={universe.name}>
        <CompositeScreen
          hero={
            <HeroBlock
              image={universe.coverImage}
              imageSeed={universe.id}
              genres={universe.genres.map(g => GENRE_LABELS[g])}
              title={universe.name}
              byline={
                <Link href={`/authors/${universe.creator.id}`} className="text-xs text-white/80 hover:underline block">
                  by {universe.creator.displayName}
                </Link>
              }
              synopsis={universe.concept}
              meta={
                <div className="flex flex-wrap gap-3 text-xs text-white/75 pt-0.5">
                  {universe.era   && <span>📅 {universe.era}</span>}
                  {universe.world && <span>🌍 {universe.world}</span>}
                  <span>📖 {universe.storyCount} stories</span>
                </div>
              }
              reactions={{
                targetId:    universe.id,
                targetType:  'universe',
                loveCount:   universe.loveCount,
                followCount: universe.followCount,
                viewCount:   universe.viewCount,
                shareUrl:    `${process.env.NEXT_PUBLIC_APP_URL}/universes/${universe.slug}`,
              }}
            />
          }
          sections={[
            {
              title:  'Latest Stories',
              action: (
                <Link href={`/stories/new?universeId=${universe.id}`} className="text-xs text-accent hover:underline font-medium">
                  + Write story
                </Link>
              ),
              node: <StoryList universeId={universe.id} />,
            },
          ]}
        />
        <Fab href={`/stories/new?universeId=${universe.id}`} label="Write a story" icon="edit" />
      </NarrowShell>
      </div>
    </>
  );
}
