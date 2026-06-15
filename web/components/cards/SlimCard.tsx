'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { useReactions } from '@/hooks/useReactions';
import { hydrateReactions } from '@/lib/reactions/hydrate';
import type { Author } from '@/lib/types';

interface Props { author: Author; }

export function SlimCard({ author }: Props) {
  const { counts, active, toggle, initCounts } = useReactions(author.id, 'author');

  useEffect(() => {
    initCounts(author.id, { love: author.loveCount, follow: author.followCount, view: 0 });
    // Restore whether this viewer already follows, so the button reflects it.
    hydrateReactions(author.id);
  }, [author.id, author.loveCount, author.followCount]); // eslint-disable-line

  return (
    <div className="flex items-center gap-3 p-3 paper-card hover:shadow-[0_2px_10px_rgba(0,0,0,0.45)] transition-shadow">
      <Link
        href={`/authors/${author.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
        aria-label={`Author: ${author.displayName}`}
      >
        <AvatarImage src={author.avatarImage} alt={author.displayName} size={40} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-paper-ink truncate">{author.displayName}</p>
          <p className="text-xs text-paper-muted tabular-nums">{counts.follow.toLocaleString()} followers</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggle('follow')}
        aria-pressed={active.follow}
        aria-label={active.follow ? `Following ${author.displayName}` : `Follow ${author.displayName}`}
        data-testid="author-follow"
        className={`btn-pill !h-8 !px-4 !text-xs shrink-0 ${active.follow ? 'btn-pill-followed' : 'btn-pill-primary'}`}
      >
        {active.follow ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}
