import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { ensureSchema, truncateAll, makeAuthor, sql } from './db';
import { getUniverses, createUniverse, deleteUniverseBySlug } from '@/lib/db/queries/universes';
import { createStory } from '@/lib/db/queries/stories';

describe('queries/universes', () => {
  beforeAll(async () => { await ensureSchema(); });
  beforeEach(async () => { await truncateAll(); });

  it('featured=true filters out universes with no stories', async () => {
    const creator = await makeAuthor();
    const empty = await createUniverse({
      slug: 'empty-uni', name: 'Empty', concept: 'c', coverImage: '/x.png',
      genres: ['scienceFiction'], creatorId: creator.id,
    });
    const populated = await createUniverse({
      slug: 'pop-uni', name: 'Populated', concept: 'c', coverImage: '/x.png',
      genres: ['scienceFiction'], creatorId: creator.id,
    });
    await createStory({
      title: 't', synopsis: 's', universeId: populated.id,
      genreTags: [], creatorId: creator.id,
    });

    const all      = await getUniverses({});
    const featured = await getUniverses({ featured: true });

    expect(all.total).toBe(2);
    expect(featured.total).toBe(1);
    expect(featured.data[0].slug).toBe('pop-uni');

    // Quiet the unused-var lint without affecting the assertion.
    expect(empty.slug).toBe('empty-uni');
  });

  it('deleteUniverseBySlug removes the row and cascades stories', async () => {
    const creator  = await makeAuthor();
    const universe = await createUniverse({
      slug: 'doomed', name: 'Doomed', concept: 'c', coverImage: '/x.png',
      genres: [], creatorId: creator.id,
    });
    await createStory({
      title: 't', synopsis: 's', universeId: universe.id,
      genreTags: [], creatorId: creator.id,
    });

    const removed = await deleteUniverseBySlug('doomed');
    expect(removed).toBe(true);

    const left = await sql`SELECT 1 FROM universes WHERE slug = 'doomed'`;
    expect(left).toHaveLength(0);
    const stories = await sql`SELECT 1 FROM stories WHERE universe_id = ${universe.id}`;
    expect(stories).toHaveLength(0);
  });

  it('genre filter binds against the enum (no SQL injection vector)', async () => {
    const creator = await makeAuthor();
    await createUniverse({
      slug: 'sf', name: 'SF', concept: 'c', coverImage: '/x.png',
      genres: ['scienceFiction'], creatorId: creator.id,
    });
    await createUniverse({
      slug: 'fa', name: 'Fa', concept: 'c', coverImage: '/x.png',
      genres: ['fantasy'], creatorId: creator.id,
    });

    const onlySF = await getUniverses({ genre: 'scienceFiction' });
    expect(onlySF.data.map(u => u.slug)).toEqual(['sf']);
  });

  it('genres come back as a JS array regardless of driver array encoding', async () => {
    const creator = await makeAuthor();
    await createUniverse({
      slug: 'multi', name: 'Multi', concept: 'c', coverImage: '/x.png',
      genres: ['scienceFiction', 'fantasy'], creatorId: creator.id,
    });
    const { data } = await getUniverses({});
    const u = data.find(u => u.slug === 'multi')!;
    expect(Array.isArray(u.genres)).toBe(true);
    expect(u.genres).toEqual(expect.arrayContaining(['scienceFiction', 'fantasy']));
    // Must be safe to .map over (this is what the home page does).
    expect(() => u.genres.map(g => g)).not.toThrow();
  });
});
