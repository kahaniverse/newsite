'use client';
import { useReactionStore, useToastStore } from '@/store';
import type { ReactionType, TargetType } from '@/lib/types';

type Kind = 'love' | 'follow';

export function useReactions(targetId: string, targetType: TargetType) {
  const counts      = useReactionStore(s => s.counts[targetId] ?? { love: 0, follow: 0, view: 0 });
  const applyToggle = useReactionStore(s => s.applyToggle);
  const isActive    = useReactionStore(s => s.isActive);
  const initCounts  = useReactionStore(s => s.initCounts);
  const toast       = useToastStore(s => s.push);

  async function toggle(type: ReactionType) {
    if (type === 'view') return;
    const kind = type as Kind;
    const wasActive  = isActive(targetId, kind);
    const intendedActive = !wasActive;

    applyToggle(targetId, kind, intendedActive);

    try {
      const res = await fetch('/api/reactions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, targetType, targetId }),
      });

      if (res.status === 401) {
        applyToggle(targetId, kind, wasActive); // revert
        toast('Sign in to react', 'info');
        return;
      }
      if (!res.ok) {
        applyToggle(targetId, kind, wasActive);
        toast('Something went wrong', 'error');
        return;
      }

      const { result } = await res.json() as { result: 'added' | 'removed' };
      const serverActive = result === 'added';
      // Reconcile if the server disagrees with our optimistic state.
      if (serverActive !== intendedActive) applyToggle(targetId, kind, serverActive);
    } catch {
      applyToggle(targetId, kind, wasActive);
      toast('Something went wrong', 'error');
    }
  }

  return { counts, toggle, initCounts };
}
