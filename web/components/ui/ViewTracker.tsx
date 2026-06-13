'use client';
import { useEffect } from 'react';
import type { TargetType } from '@/lib/types';

// Records a unique view when a signed-in user clicks through to an individual
// item's detail page. Mount this once per detail route — NOT on cards/lists, so
// merely seeing an entity in a list never changes its view count. The server
// dedups per viewer; the in-session guard just avoids a redundant request when
// the same detail is revisited within the session.
const recorded = new Set<string>();

export function ViewTracker({ targetId, targetType }: { targetId: string; targetType: TargetType }) {
  useEffect(() => {
    const key = `${targetType}:${targetId}`;
    if (recorded.has(key)) return;
    recorded.add(key);
    fetch('/api/reactions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: 'view', targetType, targetId }),
      keepalive: true,
    }).catch(() => recorded.delete(key)); // allow retry if the request never left
  }, [targetId, targetType]);

  return null;
}
