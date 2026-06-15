'use client';
import { useRouter } from 'next/navigation';
import { HeroCarousel } from '@/components/lists/HeroCarousel';
import { AuthorCarousel } from '@/components/lists/AuthorCarousel';
import { StoryList } from '@/components/lists/StoryList';
import { MoreUniverses } from '@/components/lists/MoreUniverses';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePanelStore } from '@/store';
import type { Universe, Story } from '@/lib/types';

interface Props {
  initialUniverses?: Universe[];
  searchQuery?: string;
  /** Pull the hero up behind the translucent nav (home only). Responsive to
   *  each shell's top offset: narrow header ≈72px, wide nav ≈80px, medium none. */
  heroBleed?: boolean;
  /** Let the carousel seed the detail panel selection. Off on deep-linked
   *  routes where <HydrateSelection> already drives the selection. */
  autoSeed?: boolean;
  /** Horizontal layout (panel 1): the rightmost panel already lists authors, so
   *  the author carousel is dropped, and selecting a story takes over panel 1
   *  the rightmost panel there). The story feed is also dropped, since the
   *  highlighted universe's stories fill panel 2. */
  horizontal?: boolean;
}

export function BrowsePanel({ initialUniverses, searchQuery, heroBleed, autoSeed = true, horizontal = false }: Props) {
  const { selectUniverse, selectStory } = usePanelStore();
  const router = useRouter();

  // Only used by the narrow story feed below; the horizontal layout has none.
  function handleStorySelect(story: Story) {
    selectUniverse(story.universe.slug, story.universe.id);
    selectStory(story.id);
    // On narrow viewports there is no detail panel; stack the story
    // detail by routing to its dedicated page.
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches) {
      router.push(`/stories/${story.id}`);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-24 px-1">
      {/* Universe Carousel — bleeds up behind the translucent nav on home */}
      <section
        aria-label="Universe carousel"
        className={heroBleed ? '-mt-[72px] md:mt-0 lg:-mt-20' : undefined}
      >
        <ErrorBoundary>
          <HeroCarousel initialUniverses={initialUniverses} autoSeed={autoSeed} />
        </ErrorBoundary>
      </section>

      {/* Author carousel — hidden in the horizontal layout (authors live in the
          rightmost panel there). */}
      {!horizontal && (
        <section aria-label="Featured authors">
          <SectionHeader title="Authors" />
          <ErrorBoundary>
            <AuthorCarousel />
          </ErrorBoundary>
        </section>
      )}

      {/* Story feed — hidden in the horizontal layout (the highlighted
          universe's stories fill panel 2 there). */}
      {!horizontal && (
        <section aria-label="Story feed">
          <SectionHeader title="Latest Stories" />
          <ErrorBoundary>
            <StoryList q={searchQuery} onSelect={handleStorySelect} />
          </ErrorBoundary>
        </section>
      )}

      {/* All universes — the full browsable catalog below the carousel (which
          only highlights a rotating featured set). Unlike the author/story feeds
          above, this stays visible in the horizontal layout so universes aren't
          stranded off the hero carousel. Self-hides only when there are none. */}
      <ErrorBoundary>
        <MoreUniverses />
      </ErrorBoundary>
    </div>
  );
}
