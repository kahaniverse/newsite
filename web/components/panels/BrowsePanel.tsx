'use client';
import { useRouter } from 'next/navigation';
import { HeroCarousel } from '@/components/lists/HeroCarousel';
import { AuthorCarousel } from '@/components/lists/AuthorCarousel';
import { StoryList } from '@/components/lists/StoryList';
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
}

export function BrowsePanel({ initialUniverses, searchQuery, heroBleed }: Props) {
  const { selectUniverse, selectStory } = usePanelStore();
  const router = useRouter();

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
          <HeroCarousel initialUniverses={initialUniverses} />
        </ErrorBoundary>
      </section>

      {/* Author carousel */}
      <section aria-label="Featured authors">
        <SectionHeader title="Authors" />
        <ErrorBoundary>
          <AuthorCarousel />
        </ErrorBoundary>
      </section>

      {/* Story feed */}
      <section aria-label="Story feed">
        <SectionHeader title="Latest Stories" />
        <ErrorBoundary>
          <StoryList q={searchQuery} onSelect={handleStorySelect} />
        </ErrorBoundary>
      </section>
    </div>
  );
}
