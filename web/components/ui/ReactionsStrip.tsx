'use client';
import { useEffect } from 'react';
import { useReactions } from '@/hooks/useReactions';
import type { TargetType } from '@/lib/types';

interface Props {
  targetId:    string;
  targetType:  TargetType;
  loveCount:   number;
  followCount: number;
  shareUrl?:   string;
}

export function ReactionsStrip({ targetId, targetType, loveCount, followCount, shareUrl }: Props) {
  const { counts, toggle, initCounts } = useReactions(targetId, targetType);

  useEffect(() => {
    initCounts(targetId, { love: loveCount, follow: followCount, view: 0 });
  }, [targetId, loveCount, followCount]); // eslint-disable-line

  async function handleShare() {
    const url = shareUrl ?? window.location.href;
    await navigator.clipboard.writeText(url).catch(() => null);
    // Toast is fired from store elsewhere; here we rely on CSS tooltip
  }

  return (
    <div className="flex items-center gap-4 text-sm text-text-muted" role="group" aria-label="Reactions">
      <button
        onClick={() => toggle('love')}
        className="flex items-center gap-1.5 hover:text-red-400 transition-colors reaction-btn"
        aria-label={`Love — ${counts.love}`}
      >
        <span aria-hidden>♥</span>
        <span>{counts.love.toLocaleString()}</span>
      </button>

      <button
        onClick={() => toggle('follow')}
        className="flex items-center gap-1.5 hover:text-accent transition-colors"
        aria-label={`Follow — ${counts.follow}`}
      >
        <span aria-hidden>⊕</span>
        <span>{counts.follow.toLocaleString()}</span>
      </button>

      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 hover:text-text-primary transition-colors"
        aria-label="Share"
      >
        <span aria-hidden>↗</span>
        <span>Share</span>
      </button>
    </div>
  );
}
