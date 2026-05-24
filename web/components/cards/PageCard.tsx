import { CoverImage } from '@/components/ui/CoverImage';
import { AuthorByline } from '@/components/ui/AuthorByline';
import { ReactionsStrip } from '@/components/ui/ReactionsStrip';
import type { Page } from '@/lib/types';

interface Props { page: Page; truncate?: boolean; onClick?: () => void; }

export function PageCard({ page, truncate = false, onClick }: Props) {
  return (
    <article
      className={`bg-bg-card rounded-card p-5 space-y-4 border border-border ${onClick ? 'cursor-pointer hover:border-accent transition-colors' : ''}`}
      onClick={onClick}
      aria-label="Story page"
    >
      {page.illustration && (
        <CoverImage src={page.illustration} alt="Page illustration" aspect="16/9" />
      )}
      <div className={`font-serif text-text-primary leading-relaxed whitespace-pre-wrap ${truncate ? 'line-clamp-8' : ''}`}>
        {page.content}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <AuthorByline author={page.author} />
        <ReactionsStrip
          targetId={page.id}
          targetType="page"
          loveCount={page.loveCount}
          followCount={0}
        />
      </div>
      {page.children.length > 0 && truncate && (
        <p className="text-xs text-text-muted">{page.children.length} alternate path{page.children.length !== 1 ? 's' : ''}</p>
      )}
    </article>
  );
}
