'use client';
import { HeroCarousel } from '@/components/lists/HeroCarousel';
import { AuthorCarousel } from '@/components/lists/AuthorCarousel';
import { StoryList } from '@/components/lists/StoryList';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePanelStore } from '@/store';
import type { Universe, Story } from '@/lib/types';

interface Props {
  initialUniverses?: Universe[];
  searchQuery?: string;
}

export function BrowsePanel({ initialUniverses, searchQuery }: Props) {
  const { selectUniverse, selectStory } = usePanelStore();

  function handleStorySelect(story: Story) {
    selectUniverse(story.universe.slug);
    selectStory(story.id);
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto h-full pb-24 px-1">
      {/* Universe Carousel */}
      <section aria-label="Universe carousel">
        <ErrorBoundary>
          <HeroCarousel initialUniverses={initialUniverses} />
        </ErrorBoundary>
      </section>

      {/* Author carousel */}
      <section aria-label="Featured authors">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
          Authors
        </h2>
        <ErrorBoundary>
          <AuthorCarousel />
        </ErrorBoundary>
      </section>

      {/* Story feed */}
      <section aria-label="Story feed">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
          Stories
        </h2>
        <ErrorBoundary>
          <StoryList q={searchQuery} onSelect={handleStorySelect} />
        </ErrorBoundary>
      </section>
    </div>
  );
}
