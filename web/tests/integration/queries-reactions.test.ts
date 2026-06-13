import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { ensureSchema, truncateAll, makeAuthor, makeUniverse, sql } from './db';
import { toggleReaction, recordViewOnce, getUserReactions } from '@/lib/db/queries/reactions';

describe('queries/reactions', () => {
  beforeAll(async () => { await ensureSchema(); });
  beforeEach(async () => { await truncateAll(); });

  it('toggleReaction on a universe is additive then idempotent on second call', async () => {
    const reactor  = await makeAuthor({ displayName: 'Rae' });
    const creator  = await makeAuthor({ displayName: 'Owner' });
    const universe = await makeUniverse(creator.id);

    const a = await toggleReaction(reactor.id, 'love', 'universe', universe.id);
    expect(a).toBe('added');

    const b = await toggleReaction(reactor.id, 'love', 'universe', universe.id);
    expect(b).toBe('removed');

    const c = await toggleReaction(reactor.id, 'love', 'universe', universe.id);
    expect(c).toBe('added');
  });

  it('counter on universes.love_count tracks toggle state', async () => {
    const reactor  = await makeAuthor();
    const creator  = await makeAuthor();
    const universe = await makeUniverse(creator.id);

    await toggleReaction(reactor.id, 'love', 'universe', universe.id);
    let row = await sql`SELECT love_count FROM universes WHERE id=${universe.id}`;
    expect(Number(row[0].love_count)).toBe(1);

    await toggleReaction(reactor.id, 'love', 'universe', universe.id);
    row = await sql`SELECT love_count FROM universes WHERE id=${universe.id}`;
    expect(Number(row[0].love_count)).toBe(0);
  });

  it('partial UNIQUE index allows a single (reactor, type, universe) and rejects duplicates', async () => {
    const reactor  = await makeAuthor();
    const creator  = await makeAuthor();
    const universe = await makeUniverse(creator.id);

    await sql`INSERT INTO reactions (reactor_id, reaction_type, universe_id)
              VALUES (${reactor.id}, 'love'::reaction_type, ${universe.id})`;

    await expect(sql`
      INSERT INTO reactions (reactor_id, reaction_type, universe_id)
      VALUES (${reactor.id}, 'love'::reaction_type, ${universe.id})
    `).rejects.toThrow();
  });

  it('recordViewOnce counts a unique view per viewer and is idempotent', async () => {
    const viewer   = await makeAuthor();
    const creator  = await makeAuthor();
    const universe = await makeUniverse(creator.id);

    const first  = await recordViewOnce(viewer.id, 'universe', universe.id);
    const second = await recordViewOnce(viewer.id, 'universe', universe.id);
    expect(first).toBe('added');
    expect(second).toBe('noop');

    // The viewer's repeat visit does not inflate the count.
    const row = await sql`SELECT view_count FROM universes WHERE id=${universe.id}`;
    expect(Number(row[0].view_count)).toBe(1);

    // Exactly one 'view' reaction row is written for the viewer.
    const rxRows = await sql`SELECT COUNT(*)::int AS c FROM reactions WHERE reaction_type = 'view'::reaction_type`;
    expect(rxRows[0].c).toBe(1);

    // A different viewer counts again.
    const viewer2 = await makeAuthor();
    await recordViewOnce(viewer2.id, 'universe', universe.id);
    const row2 = await sql`SELECT view_count FROM universes WHERE id=${universe.id}`;
    expect(Number(row2[0].view_count)).toBe(2);
  });

  it('getUserReactions resolves the target_id regardless of which target column is set', async () => {
    const reactor  = await makeAuthor();
    const creator  = await makeAuthor();
    const universe = await makeUniverse(creator.id);

    await toggleReaction(reactor.id, 'love', 'universe', universe.id);
    const list = await getUserReactions(reactor.id, [universe.id]);
    expect(list).toEqual([{ targetId: universe.id, type: 'love' }]);
  });
});
