'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CoverImage } from '@/components/ui/CoverImage';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { AuthorByline } from '@/components/ui/AuthorByline';
import { ReactionsStrip } from '@/components/ui/ReactionsStrip';
import { RoundCarousel } from '@/components/lists/RoundCarousel';
import { StoryList } from '@/components/lists/StoryList';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { usePanelStore } from '@/store';
import type { Universe, Author, Character } from '@/lib/types';
import { GENRE_LABELS } from '@/lib/types';

interface Props { initialUniverse?: Universe }

export function EntityDetailPanel({ initialUniverse }: Props) {
  const { selectionKind, selectedAuthorId } = usePanelStore();

  if (selectionKind === 'author' && selectedAuthorId) {
    return <AuthorDetail authorId={selectedAuthorId} />;
  }
  return <UniverseDetail initialUniverse={initialUniverse} />;
}

// ── Universe view ───────────────────────────────────────────────────
function UniverseDetail({ initialUniverse }: { initialUniverse?: Universe }) {
  const { selectedUniverseSlug, selectStory } = usePanelStore();
  const slug = selectedUniverseSlug ?? initialUniverse?.slug;

  const [universe, setUniverse]     = useState<Universe | null>(initialUniverse ?? null);
  const [characters]                = useState<Character[]>([]);
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

  if (!slug && !universe) return <FeaturedCarouselPlaceholder />;

  if (loading) return <DetailSkeleton />;
  if (!universe) return null;

  return (
    <div className="flex flex-col gap-5 overflow-y-auto h-full pb-24 px-1 panel-enter">
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

      <ErrorBoundary>
        <RoundCarousel characters={characters} />
      </ErrorBoundary>

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
          <StoryList
            universeId={universe.id}
            onSelect={s => selectStory(s.id)}
          />
        </ErrorBoundary>
      </section>
    </div>
  );
}

// ── Author view ─────────────────────────────────────────────────────
function AuthorDetail({ authorId }: { authorId: string }) {
  const { selectStory } = usePanelStore();
  const [author, setAuthor]   = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/authors/${authorId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAuthor(d); })
      .finally(() => setLoading(false));
  }, [authorId]);

  if (loading) return <DetailSkeleton />;
  if (!author) return (
    <div className="p-6 text-center text-text-muted text-sm">Author not found.</div>
  );

  return (
    <div className="flex flex-col gap-5 overflow-y-auto h-full pb-24 px-1 panel-enter">
      <section aria-label={`Author: ${author.displayName}`} className="flex items-start gap-4">
        <AvatarImage src={author.avatarImage} alt={author.displayName} size={72} />
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-2xl font-bold text-text-primary">{author.displayName}</h2>
          {author.bio && (
            <p className="text-sm text-text-muted mt-1 leading-relaxed">{author.bio}</p>
          )}
          <div className="flex gap-4 mt-2 text-xs text-text-muted">
            <span>{author.followCount.toLocaleString()} followers</span>
            <span>{author.loveCount.toLocaleString()} loves</span>
          </div>
          <div className="mt-3">
            <ReactionsStrip
              targetId={author.id}
              targetType="author"
              loveCount={author.loveCount}
              followCount={author.followCount}
            />
          </div>
        </div>
      </section>

      <section aria-label={`Stories by ${author.displayName}`}>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
          Stories
        </h3>
        <ErrorBoundary>
          <StoryList onSelect={s => selectStory(s.id)} />
        </ErrorBoundary>
      </section>
    </div>
  );
}

function DetailSkeleton() {
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

function FeaturedCarouselPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6 text-text-muted">
      <span className="text-5xl" aria-hidden>📚</span>
      <p className="font-serif text-lg text-text-primary">Pick a universe</p>
      <p className="text-sm">Select a universe from the browse panel to explore its stories.</p>
    </div>
  );
}
