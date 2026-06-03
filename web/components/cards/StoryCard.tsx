import Link from 'next/link';
import { CoverImage } from '@/components/ui/CoverImage';
import { AuthorByline } from '@/components/ui/AuthorByline';
import { ReactionsStrip } from '@/components/ui/ReactionsStrip';
import type { Story } from '@/lib/types';
import { GENRE_LABELS } from '@/lib/types';

interface Props {
  story:     Story;
  onClick?:  () => void;
  compact?:  boolean;
  selected?: boolean;
}

export function StoryCard({ story, onClick, compact = false, selected = false }: Props) {
  return (
    <article
      className={`bg-bg-card rounded-card overflow-hidden border transition-colors cursor-pointer ${
        selected
          ? 'border-accent ring-2 ring-accent/40'
          : 'border-border hover:border-accent'
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      aria-label={`Story: ${story.title}`}
      aria-pressed={selected}
    >
      {!compact && story.coverImage && (
        <CoverImage src={story.coverImage} alt={story.title} aspect="16/9" />
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1 min-w-0">
            {story.genreTags.slice(0, 2).map(g => (
              <span key={g} className="text-xs bg-bg-elevated text-text-muted px-2 py-0.5 rounded-full">
                {GENRE_LABELS[g]}
              </span>
            ))}
          </div>
          <Link
            href={`/universes/${story.universe.slug}`}
            onClick={e => e.stopPropagation()}
            className="shrink-0 text-xs text-accent hover:underline truncate max-w-[50%] text-right"
            aria-label={`Universe: ${story.universe.name}`}
            title={story.universe.name}
          >
            {story.universe.name}
          </Link>
        </div>
        <h3 className="font-serif text-base font-semibold text-text-primary leading-snug line-clamp-2">
          {story.title}
        </h3>
        {!compact && (
          <p className="text-xs text-text-muted line-clamp-3">{story.synopsis}</p>
        )}
        <div className="flex items-center justify-between pt-1">
          <AuthorByline author={story.contributors[0]?.author ?? { id: '', displayName: 'Unknown' }} />
          <ReactionsStrip
            targetId={story.id}
            targetType="story"
            loveCount={story.loveCount}
            followCount={story.followCount}
          />
        </div>
      </div>
    </article>
  );
}
