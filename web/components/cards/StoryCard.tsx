import Link from 'next/link';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { ReactionsStrip } from '@/components/ui/ReactionsStrip';
import { sampleCover } from '@/lib/sample-images';
import type { Story } from '@/lib/types';

interface Props {
  story:     Story;
  onClick?:  () => void;
  compact?:  boolean;
  selected?: boolean;
  /** Row index — drives the alternating image side, like the old app. */
  index?:    number;
}

export function StoryCard({ story, onClick, compact = false, selected = false, index = 0 }: Props) {
  const author = story.contributors[0]?.author ?? { id: '', displayName: 'Unknown' };
  const even   = index % 2 === 0;
  const cover  = story.coverImage || sampleCover(story.id, 480, 360);

  const image = !compact && (
    <div className="flex-1 min-w-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cover}
        alt={story.title}
        loading="lazy"
        className="w-full h-full min-h-[140px] max-h-[200px] object-cover rounded-sm border border-black/30"
      />
    </div>
  );

  return (
    <article
      className={`paper-card overflow-hidden cursor-pointer transition-shadow ${
        selected ? 'ring-2 ring-brand shadow-[0_2px_10px_rgba(0,0,0,0.45)]' : 'hover:shadow-[0_2px_10px_rgba(0,0,0,0.45)]'
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      data-testid="story-card"
      aria-label={`Story: ${story.title}`}
      aria-pressed={selected}
    >
      <div className="p-3 space-y-2">
        {/* Region A — header: avatar | universe handle + title */}
        <div className="flex items-start gap-3">
          <Link
            href={`/authors/${author.id}`}
            onClick={e => e.stopPropagation()}
            className="shrink-0"
            aria-label={`Author: ${author.displayName}`}
          >
            <AvatarImage src={author.avatarImage} alt={author.displayName} size={44} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/universes/${story.universe.slug}`}
              onClick={e => e.stopPropagation()}
              className="text-xs font-medium text-accent-deep hover:underline truncate block"
              title={story.universe.name}
            >
              {story.universe.name}
            </Link>
            <h3 className="font-serif text-lg font-bold text-paper-ink leading-snug line-clamp-2">
              {story.title}
            </h3>
          </div>
        </div>

        {/* Region B — synopsis + alternating-side image */}
        {!compact && (
          <div className="flex gap-3 items-stretch">
            {even && image}
            <p className="flex-1 min-w-0 text-sm text-paper-ink/90 leading-relaxed line-clamp-[8]">
              {story.synopsis}
            </p>
            {!even && image}
          </div>
        )}

        {/* Region C — reactions */}
        <ReactionsStrip
          targetId={story.id}
          targetType="story"
          loveCount={story.loveCount}
          followCount={story.followCount}
          viewCount={story.viewCount}
          block
        />
      </div>
    </article>
  );
}
