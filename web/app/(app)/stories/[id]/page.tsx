import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound }    from 'next/navigation';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { HorizontalBrowse } from '@/components/shell/HorizontalBrowse';
import { CompositeScreen } from '@/components/screens/CompositeScreen';
import { HeroBlock }   from '@/components/screens/HeroBlock';
import { PageList }    from '@/components/lists/PageList';
import { HydrateSelection } from '@/components/shell/HydrateSelection';
import { ViewTracker }   from '@/components/ui/ViewTracker';
import { Fab }          from '@/components/shell/Fab';
import { getStoryById } from '@/lib/db/queries/stories';
import { getPagesByStory } from '@/lib/db/queries/pages';
import { GENRE_LABELS } from '@/lib/types';

// Render per request so reaction counts (denormalized columns, mutated by likes/
// views) are always current — otherwise Next's Data Cache serves a stale count.
export const dynamic = 'force-dynamic';

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getStoryById(params.id);
  if (!s) return {};
  return {
    title:       `${s.title} — Kahaniverse`,
    description: s.synopsis,
    openGraph:   { title: s.title, description: s.synopsis, images: s.coverImage ? [s.coverImage] : [] },
  };
}

export default async function StoryPage({ params }: Props) {
  const story = await getStoryById(params.id);
  if (!story) notFound();

  const pages  = await getPagesByStory(story.id);
  const root   = pages.find(p => !p.parentId);
  // The root is the story concept (page 0); its direct children are the
  // "beginnings" (page 1) to dive into. The concept itself shows as the hero.
  const beginnings = root ? pages.filter(p => p.parentId === root.id) : [];
  const author = story.contributors[0]?.author;

  return (
    <>
      {/* Count a unique view for this story (click-through only). */}
      <ViewTracker targetId={story.id} targetType="story" />

      {/* Pre-select this story so the horizontal panels cascade to it. */}
      <HydrateSelection
        universeSlug={story.universe.slug}
        universeId={story.universe.id}
        storyId={story.id}
        detailMeta={{ kind: 'story', storyId: story.id }}
      />

      {/* Horizontal cascading panels (tablet + desktop) */}
      <div className="hidden md:block">
        <HorizontalBrowse />
      </div>

      {/* Narrow stacked layout (mobile) */}
      <div className="block md:hidden">
      <NarrowShell title={story.title} subtitle={story.universe.name}>
      <CompositeScreen
        hero={
          <HeroBlock
            image={story.coverImage}
            imageSeed={story.id}
            genres={story.genreTags.map(g => GENRE_LABELS[g])}
            title={story.title}
            byline={
              author && (
                <Link href={`/authors/${author.id}`} className="text-xs text-white/80 hover:underline block">
                  by {author.displayName}
                </Link>
              )
            }
            synopsis={story.synopsis}
            reactions={{
              targetId:    story.id,
              targetType:  'story',
              loveCount:   story.loveCount,
              followCount: story.followCount,
              viewCount:   story.viewCount,
            }}
          />
        }
        sections={[
          {
            title: 'Alternate Beginnings',
            node:
              beginnings.length > 0
                ? <PageList pages={beginnings} />
                : <p className="text-sm text-text-muted px-1">No pages yet — be the first to begin this story.</p>,
          },
        ]}
      />

      <Fab
        href={`/pages/new?storyId=${story.id}&parentId=${story.id}&intent=next`}
        label="Add a page"
        icon="edit"
        testId="story-add-page"
      />
      </NarrowShell>
      </div>
    </>
  );
}
