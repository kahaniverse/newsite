import { useReactionStore } from '@/store';

interface ServerState {
  targetId: string;
  love: number; follow: number; view: number;
  myLove: boolean; myFollow: boolean;
}

// Hydrates authoritative reaction state (counts + whether the viewer reacted)
// from the server. ReactionsStrip instances mount all over a view (cards + detail
// headers) and often reference the SAME entity; rather than firing a request per
// strip, we batch every targetId requested within a tick into one GET. Each id is
// fetched at most once per session, so repeated appearances of an entity cost
// nothing, and the count shown comes from the same source as the filled glyph.

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

    // Every requested id resolves — a target absent from the response has no
    // reactions, so it's authoritatively zero/not-reacted.
    const byTarget = new Map<string, ServerState>(
      ids.map(id => [id, { targetId: id, love: 0, follow: 0, view: 0, myLove: false, myFollow: false }]),
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
