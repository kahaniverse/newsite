'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { ReactionsStrip } from '@/components/ui/ReactionsStrip';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useReactionGestures } from '@/hooks/useReactionGestures';
import { usePanelStore } from '@/store';
import { useInfiniteUniverses } from '@/hooks/useInfiniteUniverses';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { sampleCover } from '@/lib/sample-images';
import { GENRE_LABELS } from '@/lib/types';
import type { Universe } from '@/lib/types';

// The full universe catalog, listed below the hero carousel and paged in on
// scroll. The carousel only *highlights* a rotating featured set (and only one
// slide at a time); this list is the browsable index of every universe so none
// are stranded off-screen. It intentionally does NOT subtract the carousel's
// featured universes — when total universes ≤ the featured count that left the
// list empty and the whole section vanished. Self-contained: owns its header and
// hides only when there are genuinely no universes at all.
export function MoreUniverses() {
  const router = useRouter();
  const { selectionKind, selectedUniverseSlug, selectUniverse, setFocus } = usePanelStore();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteUniverses({ limit: 12 });

  const sentinel = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  const all = data?.pages.flatMap(p => p.data) ?? [];

  // No header flash on first load; nothing to show once we know there are none.
  if (isLoading) return null;
  if (!all.length && !hasNextPage) return null;

  const open = (u: Universe) => {
    selectUniverse(u.slug, u.id);
    // Narrow: stack the universe screen. Wide: hand its hero to panel 1.
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches) {
      router.push(`/universes/${u.slug}`);
    } else {
      setFocus('universe');
    }
  };

  return (
    <section aria-label="All universes">
      <SectionHeader title="All Universes" />
      <div className="space-y-4">
        {all.map((u, i) => (
          <UniverseTile
            key={u.id}
            universe={u}
            index={i}
            selected={selectionKind === 'universe' && selectedUniverseSlug === u.slug}
            onClick={() => open(u)}
          />
        ))}
        <div ref={sentinel} className="h-4" aria-hidden />
        {isFetchingNextPage && <CardSkeleton />}
      </div>
    </section>
  );
}

interface TileProps {
  universe: Universe;
  index:    number;
  selected: boolean;
  onClick:  () => void;
}

// Mirrors StoryCard: paper card, avatar + heading header, concept beside an
// alternating-side cover, reactions footer.
function UniverseTile({ universe, index, selected, onClick }: TileProps) {
  const even  = index % 2 === 0;
  const cover = universe.coverImage || sampleCover(universe.id, 480, 360);

  // Double-tap = love, swipe right/left = follow/unfollow, single tap = open.
  const gestures = useReactionGestures(universe.id, 'universe', { onTap: onClick, label: universe.name, canFollow: true });

  const image = (
    <div className="flex-1 min-w-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cover}
        alt={universe.name}
        loading="lazy"
        className="w-full h-full min-h-[140px] max-h-[200px] object-cover rounded-sm border border-black/30"
      />
    </div>
  );

  return (
    <article
      role="button"
      className={`paper-card overflow-hidden cursor-pointer transition-shadow touch-pan-y select-none ${
        selected ? 'ring-2 ring-brand shadow-[0_2px_10px_rgba(0,0,0,0.45)]' : 'hover:shadow-[0_2px_10px_rgba(0,0,0,0.45)]'
      }`}
      {...gestures}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      aria-label={`Universe: ${universe.name}`}
      aria-pressed={selected}
    >
      <div className="p-3 space-y-2">
        {/* Region A — header: creator avatar | genre + universe name */}
        <div className="flex items-start gap-3">
          <Link
            href={`/authors/${universe.creator.id}`}
            onClick={e => e.stopPropagation()}
            className="shrink-0"
            aria-label={`Author: ${universe.creator.displayName}`}
          >
            <AvatarImage src={universe.creator.avatarImage} alt={universe.creator.displayName} size={44} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-accent-deep truncate" title={universe.creator.displayName}>
              {universe.genres.length ? universe.genres.map(g => GENRE_LABELS[g]).join(' · ') : `by ${universe.creator.displayName}`}
            </p>
            <h3 className="font-serif text-lg font-bold text-paper-ink leading-snug line-clamp-2">
              {universe.name}
            </h3>
          </div>
        </div>

        {/* Region B — concept + alternating-side cover */}
        <div className="flex gap-3 items-stretch">
          {even && image}
          <p className="flex-1 min-w-0 text-sm text-paper-ink/90 leading-relaxed line-clamp-[8]">
            {universe.concept}
          </p>
          {!even && image}
        </div>

        {/* Region C — reactions */}
        <ReactionsStrip
          targetId={universe.id}
          targetType="universe"
          loveCount={universe.loveCount}
          followCount={universe.followCount}
          viewCount={universe.viewCount}
          block
        />
      </div>
    </article>
  );
}
