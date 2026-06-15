'use client';
import { useState } from 'react';
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

  // The horizontal home panel owns its own search bar (the standalone Discover
  // route is gone); other usages still take a query via the searchQuery prop.
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const effectiveQuery = horizontal ? (query || undefined) : searchQuery;

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
      {/* Search — lives at the top of the home panel in the horizontal layout */}
      {horizontal && (
        <div className="relative">
          <input
            type="search"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setQuery(input)}
            placeholder="Search universes…"
            className="w-full bg-bg-elevated border border-border rounded-input px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent pr-10"
            aria-label="Search"
          />
          <button
            type="button"
            onClick={() => setQuery(input)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent transition-colors"
            aria-label="Search"
          >
            🔍
          </button>
        </div>
      )}

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
            <StoryList q={effectiveQuery} onSelect={handleStorySelect} />
          </ErrorBoundary>
        </section>
      )}

      {/* All universes — the full browsable catalog below the carousel (which
          only highlights a rotating featured set). Unlike the author/story feeds
          above, this stays visible in the horizontal layout so universes aren't
          stranded off the hero carousel. Self-hides only when there are none. */}
      <ErrorBoundary>
        <MoreUniverses q={effectiveQuery} />
      </ErrorBoundary>
    </div>
  );
}
