import { useReactionStore } from '@/store';

interface ServerState { targetId: string; myLove: boolean; myFollow: boolean }

// Restores the viewer's own love/follow flags (the red/active glyph) from the
// server. ReactionsStrip instances mount all over a view (cards + detail headers)
// and often reference the SAME entity; rather than firing a request per strip, we
// batch every targetId requested within a tick into one GET. Each id is fetched at
// most once per session, so repeated appearances of an entity cost nothing. Counts
// are NOT hydrated — they come from the denormalized column via the prop/store.

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
    const { states } = (await res.json()) as { states: ServerState[] };

    // Every requested id resolves — a target absent from the response means the
    // viewer hasn't reacted to it.
    const byTarget = new Map<string, ServerState>(
      ids.map(id => [id, { targetId: id, myLove: false, myFollow: false }]),
    );
    for (const s of states) if (byTarget.has(s.targetId)) byTarget.set(s.targetId, s);
    useReactionStore.getState().hydrateState([...byTarget.values()]);
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
