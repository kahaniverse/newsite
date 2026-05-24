'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CoverImage } from '@/components/ui/CoverImage';
import { AuthorByline } from '@/components/ui/AuthorByline';
import { ReactionsStrip } from '@/components/ui/ReactionsStrip';
import { RoundCarousel } from '@/components/lists/RoundCarousel';
import { StoryList } from '@/components/lists/StoryList';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { usePanelStore } from '@/store';
import type { Universe, Story, Character } from '@/lib/types';
import { GENRE_LABELS } from '@/lib/types';

interface Props { initialUniverse?: Universe }

export function EntityDetailPanel({ initialUniverse }: Props) {
  const { selectedUniverseSlug, selectStory } = usePanelStore();
  const slug = selectedUniverseSlug ?? initialUniverse?.slug;

  const [universe, setUniverse]     = useState<Universe | null>(initialUniverse ?? null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (!slug) return;
    if (universe?.slug === slug) return;
    setLoading(true);
    fetch(`/api/universes/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUniverse(d); })
      .finally(() => setLoading(false));
  }, [slug]); // eslint-disable-line

  // Placeholder empty state when nothing selected
  if (!slug && !universe) return <FeaturedCarouselPlaceholder />;

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="w-full h-48" />
        <Skeleton className="w-2/3 h-6" />
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-full h-4" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!universe) return null;

  return (
    <div className="flex flex-col gap-5 overflow-y-auto h-full pb-24 px-1 panel-enter">
      {/* Hero */}
      <section aria-label={`Universe: ${universe.name}`}>
        <CoverImage src={universe.coverImage} alt={universe.name} aspect="16/9" priority />
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {universe.genres.map(g => (
              <span key={g} className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                {GENRE_LABELS[g]}
              </span>
            ))}
          </div>
          <h2 className="font-serif text-2xl font-bold text-text-primary">{universe.name}</h2>
          <p className="text-sm text-text-muted leading-relaxed">{universe.concept}</p>
          <div className="flex flex-wrap gap-3 text-xs text-text-muted">
            {universe.era   && <span>📅 {universe.era}</span>}
            {universe.world && <span>🌍 {universe.world}</span>}
            <span>📖 {universe.storyCount} stories</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <AuthorByline author={universe.creator} size="md" />
            <ReactionsStrip
              targetId={universe.id}
              targetType="universe"
              loveCount={universe.loveCount}
              followCount={universe.followCount}
              shareUrl={`${process.env.NEXT_PUBLIC_APP_URL}/universes/${universe.slug}`}
            />
          </div>
        </div>
      </section>

      {/* Characters */}
      <ErrorBoundary>
        <RoundCarousel characters={characters} />
      </ErrorBoundary>

      {/* Stories within this universe */}
      <section aria-label="Stories in this universe">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Stories
          </h3>
          <Link
            href={`/stories/new?universeId=${universe.id}`}
            className="text-xs text-accent hover:underline font-medium"
            aria-label="Write a new story in this universe"
          >
            + Write story
          </Link>
        </div>
        <ErrorBoundary>
          <StoryList universeId={universe.id} onSelect={s => selectStory(s.id)} />
        </ErrorBoundary>
      </section>
    </div>
  );
}

function FeaturedCarouselPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6 text-text-muted">
      <span className="text-5xl" aria-hidden>📚</span>
      <p className="font-serif text-lg text-text-primary">Pick a universe</p>
      <p className="text-sm">Select a universe from the browse panel to explore its stories.</p>
    </div>
  );
}
