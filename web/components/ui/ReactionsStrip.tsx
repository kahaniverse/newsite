'use client';
import { useEffect } from 'react';
import { useReactions } from '@/hooks/useReactions';
import { hydrateReactions } from '@/lib/reactions/hydrate';
import { useToastStore } from '@/store';
import type { TargetType } from '@/lib/types';

interface Props {
  targetId:    string;
  targetType:  TargetType;
  loveCount:   number;
  followCount: number;
  viewCount?:  number;
  shareUrl?:   string;
  /**
   * `ink`  — for the light "paper" cards (dark muted glyphs).
   * `light`— for dark chrome backgrounds (light glyphs).
   */
  tone?:       'ink' | 'light';
  /**
   * `block` reproduces the old in-card ReactionStrip: a full-width row,
   * space-between, with red eye/heart/compass glyphs and ink counts.
   */
  block?:      boolean;
}

export function ReactionsStrip({
  targetId, targetType, loveCount, followCount, viewCount = 0, shareUrl, tone = 'ink', block = false,
}: Props) {
  const { counts, active, toggle, initCounts } = useReactions(targetId, targetType);
  const pushToast = useToastStore(s => s.push);

  useEffect(() => {
    initCounts(targetId, { love: loveCount, follow: followCount, view: viewCount });
    // Restore whether *this viewer* has loved/connected, so the filled state is
    // consistent everywhere this entity appears (card, list, detail header).
    hydrateReactions(targetId);
  }, [targetId, loveCount, followCount, viewCount]); // eslint-disable-line

  async function handleShare() {
    const url = shareUrl ?? window.location.href;
    await navigator.clipboard.writeText(url).catch(() => null);
    pushToast('Link copied', 'info');
  }

  // ── Block (in-card) variant — faithful to the old ReactionStrip ──────
  if (block) {
    const size = 19;
    return (
      <div className="flex items-center justify-between w-full px-1 pt-2 text-paper-ink border-t border-paper-border" role="group" aria-label="Reactions">
        <span className="flex items-center gap-1.5 text-brand" aria-label={`Views — ${counts.view}`}>
          <Eye size={size} /><span className="text-xs tabular-nums text-paper-ink">{counts.view.toLocaleString()}</span>
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggle('love'); }}
          className={`flex items-center gap-1.5 text-brand ${active.love ? 'reaction-active' : ''}`}
          data-testid="reaction-love"
          aria-label={`Love — ${counts.love}`} aria-pressed={active.love}
        >
          <Heart size={size} filled={active.love} /><span className="text-xs tabular-nums text-paper-ink">{counts.love.toLocaleString()}</span>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggle('follow'); }}
          className="flex items-center gap-1.5 text-brand"
          data-testid="reaction-follow"
          aria-label={`Follow — ${counts.follow}`} aria-pressed={active.follow}
        >
          <Compass size={size} filled={active.follow} /><span className="text-xs tabular-nums text-paper-ink">{counts.follow.toLocaleString()}</span>
        </button>
      </div>
    );
  }

  // ── Inline variant (hero / detail headers) ──────────────────────────
  const base         = tone === 'light' ? 'text-text-muted' : 'text-paper-muted';
  const followHover  = tone === 'light' ? 'hover:text-accent' : 'hover:text-accent-deep';
  const followActive = tone === 'light' ? 'text-accent' : 'text-accent-deep';
  const shareHover   = tone === 'light' ? 'hover:text-text-primary' : 'hover:text-paper-ink';

  return (
    <div className={`flex items-center gap-3 text-sm ${base}`} role="group" aria-label="Reactions">
      <span className="flex items-center gap-1" aria-label={`Views — ${counts.view}`}>
        <Eye />
        <span className="text-xs tabular-nums">{counts.view.toLocaleString()}</span>
      </span>

      <button
        type="button"
        onClick={() => toggle('love')}
        className={`flex items-center gap-1 transition-colors hover:text-brand ${active.love ? 'text-brand reaction-active' : ''}`}
        aria-label={`Love — ${counts.love}`}
        aria-pressed={active.love}
      >
        <Heart filled={active.love} />
        <span className="text-xs tabular-nums">{counts.love.toLocaleString()}</span>
      </button>

      <button
        type="button"
        onClick={() => toggle('follow')}
        className={`flex items-center gap-1 transition-colors ${followHover} ${active.follow ? followActive : ''}`}
        aria-label={`Follow — ${counts.follow}`}
        aria-pressed={active.follow}
      >
        <Compass filled={active.follow} />
        <span className="text-xs tabular-nums">{counts.follow.toLocaleString()}</span>
      </button>

      {shareUrl && (
        <button
          type="button"
          onClick={handleShare}
          className={`flex items-center gap-1 transition-colors ${shareHover}`}
          aria-label="Share"
        >
          <Share />
        </button>
      )}
    </div>
  );
}

// ── Icons (stroke = currentColor) ────────────────────────────────────
function Eye({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Heart({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 21s-7.5-4.6-10-9.3C.7 9 1.6 5.5 4.8 4.6 7 4 9 5 12 8c3-3 5-4 7.2-3.4 3.2.9 4.1 4.4 2.8 7.1C19.5 16.4 12 21 12 21Z" />
    </svg>
  );
}

function Compass({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" fill={filled ? 'currentColor' : 'none'} />
    </svg>
  );
}

function Share() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
    </svg>
  );
}
