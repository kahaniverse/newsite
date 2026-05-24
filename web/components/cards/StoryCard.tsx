import { CoverImage } from '@/components/ui/CoverImage';
import { AuthorByline } from '@/components/ui/AuthorByline';
import { ReactionsStrip } from '@/components/ui/ReactionsStrip';
import type { Story } from '@/lib/types';
import { GENRE_LABELS } from '@/lib/types';

interface Props {
  story:     Story;
  onClick?:  () => void;
  compact?:  boolean;
}

export function StoryCard({ story, onClick, compact = false }: Props) {
  return (
    <article
      className="bg-bg-card rounded-card overflow-hidden border border-border hover:border-accent transition-colors cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      aria-label={`Story: ${story.title}`}
    >
      {!compact && story.coverImage && (
        <CoverImage src={story.coverImage} alt={story.title} aspect="16/9" />
      )}
      <div className="p-4 space-y-2">
        <div className="flex flex-wrap gap-1">
          {story.genreTags.slice(0, 2).map(g => (
            <span key={g} className="text-xs bg-bg-elevated text-text-muted px-2 py-0.5 rounded-full">
              {GENRE_LABELS[g]}
            </span>
          ))}
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
