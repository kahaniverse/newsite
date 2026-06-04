import { CoverImage } from '@/components/ui/CoverImage';
import { AuthorByline } from '@/components/ui/AuthorByline';
import { ReactionsStrip } from '@/components/ui/ReactionsStrip';
import type { Page } from '@/lib/types';

interface Props { page: Page; truncate?: boolean; onClick?: () => void; }

export function PageCard({ page, truncate = false, onClick }: Props) {
  return (
    <article
      className={`paper-card p-5 space-y-4 ${onClick ? 'cursor-pointer hover:shadow-[0_2px_10px_rgba(0,0,0,0.45)] transition-shadow' : ''}`}
      onClick={onClick}
      aria-label="Story page"
    >
      {page.illustration && (
        <CoverImage src={page.illustration} alt="Page illustration" aspect="16/9" />
      )}
      <div className={`font-serif text-paper-ink leading-relaxed whitespace-pre-wrap ${truncate ? 'line-clamp-8' : ''}`}>
        {page.content}
      </div>
      <div className="pt-1">
        <AuthorByline author={page.author} tone="ink" />
      </div>
      <ReactionsStrip
        targetId={page.id}
        targetType="page"
        loveCount={page.loveCount}
        followCount={0}
        viewCount={page.viewCount}
        block
      />
      {page.children.length > 0 && truncate && (
        <p className="text-xs text-paper-muted">{page.children.length} alternate path{page.children.length !== 1 ? 's' : ''}</p>
      )}
    </article>
  );
}
