import { useReactionStore } from '@/store';

// Hydrates the viewer's own love/connect state from the server. ReactionsStrip
// instances mount all over a view (cards + detail headers) and often reference
// the SAME entity; rather than firing a request per strip, we batch every
// targetId requested within a tick into one GET. Each id is fetched at most once
// per session, so repeated appearances of an entity cost nothing.

const fetched = new Set<string>();   // ids we've already resolved (or are resolving)
let pending   = new Set<string>();   // ids awaiting the next flush
let scheduled = false;

async function flush() {
  scheduled = false;
  const ids = [...pending];
  pending = new Set();
  if (!ids.length) return;

  try {
    const res = await fetch(`/api/reactions?targetIds=${ids.join(',')}`);
    if (!res.ok) { ids.forEach(id => fetched.delete(id)); return; } // allow retry
    const { reactions } = (await res.json()) as {
      reactions: Array<{ targetId: string; type: 'love' | 'follow' | 'view' }>;
    };

    // Every requested id resolves — absence of a row means "not reacted".
    const byTarget = new Map(ids.map(id => [id, { targetId: id, love: false, follow: false }]));
    for (const r of reactions) {
      const e = byTarget.get(r.targetId);
      if (!e) continue;
      if (r.type === 'love')   e.love = true;
      if (r.type === 'follow') e.follow = true;
    }
    useReactionStore.getState().setActiveStates([...byTarget.values()]);
  } catch {
    ids.forEach(id => fetched.delete(id)); // allow retry on transient failure
  }
}

export function hydrateReactions(targetId: string) {
  if (fetched.has(targetId)) return;
  fetched.add(targetId);
  pending.add(targetId);
  if (!scheduled) {
    scheduled = true;
    setTimeout(flush, 0);
  }
}
