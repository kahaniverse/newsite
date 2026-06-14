'use client';
import { useEffect } from 'react';
import { useReactionStore } from '@/store';
import type { TargetType } from '@/lib/types';

// Records a unique view when a signed-in user clicks through to an individual
// item's detail page. Mount this once per detail route — NOT on cards/lists, so
// merely seeing an entity in a list never changes its view count. The server
// dedups per viewer; the in-session guard just avoids a redundant request when
// the same detail is revisited within the session. On a newly-counted view we
// optimistically bump the store so the increment is visible immediately.
const recorded = new Set<string>();

export function ViewTracker({ targetId, targetType }: { targetId: string; targetType: TargetType }) {
  const recordView = useReactionStore(s => s.recordView);

  useEffect(() => {
    const key = `${targetType}:${targetId}`;
    if (recorded.has(key)) return;
    recorded.add(key);
    (async () => {
      try {
        const res = await fetch('/api/reactions', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ type: 'view', targetType, targetId }),
        });
        if (!res.ok) { recorded.delete(key); return; }
        const { result } = await res.json() as { result: 'added' | 'noop' };
        if (result === 'added') recordView(targetId); // first unique view → reflect it now
      } catch {
        recorded.delete(key); // allow retry if the request never left
      }
    })();
  }, [targetId, targetType, recordView]);

  return null;
}
