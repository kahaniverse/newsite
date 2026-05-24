import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { ensureSchema, truncateAll, makeAuthor, makeUniverse, sql } from './db';
import { createStory } from '@/lib/db/queries/stories';
import { createPage, getPageById, getPagesByStory } from '@/lib/db/queries/pages';

describe('queries/pages', () => {
  beforeAll(async () => { await ensureSchema(); });
  beforeEach(async () => { await truncateAll(); });

  it('root page has parentId = null', async () => {
    const author   = await makeAuthor();
    const universe = await makeUniverse(author.id);
    const story    = await createStory({
      title: 's', synopsis: 's', universeId: universe.id,
      genreTags: [], creatorId: author.id,
    });

    const root = await createPage({
      storyId:  story.id,
      parentId: null,
      content:  'Once upon a time',
      authorId: author.id,
    });

    expect(root.parentId).toBeNull();
    const fetched = await getPageById(root.id);
    expect(fetched?.parentId).toBeNull();
  });

  it('cannot create two root pages for the same story', async () => {
    const author   = await makeAuthor();
    const universe = await makeUniverse(author.id);
    const story    = await createStory({
      title: 's', synopsis: 's', universeId: universe.id,
      genreTags: [], creatorId: author.id,
    });

    await createPage({ storyId: story.id, parentId: null, content: 'one', authorId: author.id });
    await expect(
      createPage({ storyId: story.id, parentId: null, content: 'two', authorId: author.id }),
    ).rejects.toThrow();
  });

  it('createPage bumps stories.page_count atomically', async () => {
    const author   = await makeAuthor();
    const universe = await makeUniverse(author.id);
    const story    = await createStory({
      title: 's', synopsis: 's', universeId: universe.id,
      genreTags: [], creatorId: author.id,
    });

    const root = await createPage({ storyId: story.id, parentId: null, content: 'a', authorId: author.id });
    await createPage({ storyId: story.id, parentId: root.id, content: 'b', authorId: author.id });

    const rows = await sql`SELECT page_count FROM stories WHERE id=${story.id}`;
    expect(Number(rows[0].page_count)).toBe(2);
  });

  it('getPagesByStory returns pages in creation order', async () => {
    const author   = await makeAuthor();
    const universe = await makeUniverse(author.id);
    const story    = await createStory({
      title: 's', synopsis: 's', universeId: universe.id,
      genreTags: [], creatorId: author.id,
    });

    const root = await createPage({ storyId: story.id, parentId: null,    content: 'first',  authorId: author.id });
    const c1   = await createPage({ storyId: story.id, parentId: root.id, content: 'second', authorId: author.id });

    const list = await getPagesByStory(story.id);
    expect(list.map(p => p.id)).toEqual([root.id, c1.id]);
  });
});
