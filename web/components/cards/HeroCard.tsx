import { CoverImage } from '@/components/ui/CoverImage';
import { AuthorByline } from '@/components/ui/AuthorByline';
import { ReactionsStrip } from '@/components/ui/ReactionsStrip';
import type { Universe } from '@/lib/types';
import { GENRE_LABELS } from '@/lib/types';

interface Props { universe: Universe; onClick?: () => void; }

export function HeroCard({ universe, onClick }: Props) {
  return (
    <article
      className="paper-card overflow-hidden cursor-pointer hover:shadow-[0_2px_10px_rgba(0,0,0,0.45)] transition-shadow"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      aria-label={`Universe: ${universe.name}`}
    >
      <CoverImage src={universe.coverImage} alt={universe.name} aspect="16/9" priority seed={universe.id} />
      <div className="p-5 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {universe.genres.slice(0, 3).map(g => (
            <span key={g} className="text-xs bg-accent-deep/10 text-accent-deep px-2 py-0.5 rounded-full">
              {GENRE_LABELS[g]}
            </span>
          ))}
        </div>
        <h2 className="font-serif text-xl font-bold text-paper-ink leading-snug">{universe.name}</h2>
        <p className="text-sm text-paper-muted italic line-clamp-3">{universe.concept}</p>
        <div className="flex items-center justify-between pt-2 border-t border-paper-border">
          <AuthorByline author={universe.creator} tone="ink" />
          <ReactionsStrip
            targetId={universe.id}
            targetType="universe"
            loveCount={universe.loveCount}
            followCount={universe.followCount}
            viewCount={universe.viewCount}
          />
        </div>
      </div>
    </article>
  );
}
