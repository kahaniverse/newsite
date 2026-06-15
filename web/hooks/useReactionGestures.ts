'use client';
import { useReactions } from '@/hooks/useReactions';
import { useCardGestures } from '@/hooks/useCardGestures';
import { useToastStore } from '@/store';
import type { TargetType } from '@/lib/types';

interface Opts {
  onTap?:    () => void;  // the card's normal open/drill action
  label?:    string;      // entity name, used in the swipe confirmation toast
  canFollow?: boolean;    // pages can't be followed
}

// Reaction gestures for a content card: double-tap toggles love, swipe right
// follows, swipe left unfollows (with a toast, since the swipe has no visible
// control). Shares the reaction store with the card's ReactionsStrip, so the
// filled glyph + counts update in lockstep.
export function useReactionGestures(targetId: string, targetType: TargetType, opts: Opts = {}) {
  const { active, toggle } = useReactions(targetId, targetType);
  const toast = useToastStore(s => s.push);
  const name  = opts.label ? ` ${opts.label}` : '';

  return useCardGestures({
    onTap:       opts.onTap,
    onDoubleTap: () => toggle('love'),
    onSwipeRight: opts.canFollow
      ? () => { if (!active.follow) { toggle('follow'); toast(`Following${name}`, 'info'); } }
      : undefined,
    onSwipeLeft: opts.canFollow
      ? () => { if (active.follow) { toggle('follow'); toast(`Unfollowed${name}`, 'info'); } }
      : undefined,
  });
}
