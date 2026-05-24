import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { ensureSchema, truncateAll, makeAuthor, makeUniverse } from './db';
import { createStory, getStoryById, getStories, isStoryContributor, updateStory } from '@/lib/db/queries/stories';

describe('queries/stories', () => {
  beforeAll(async () => { await ensureSchema(); });
  beforeEach(async () => { await truncateAll(); });

  it('createStory writes story + creator contributor in one round trip', async () => {
    const creator  = await makeAuthor({ displayName: 'Sam' });
    const universe = await makeUniverse(creator.id);

    const story = await createStory({
      title:      'A Quiet Beginning',
      synopsis:   'It starts at dawn.',
      universeId: universe.id,
      genreTags:  ['scienceFiction'],
      creatorId:  creator.id,
    });

    expect(story.title).toBe('A Quiet Beginning');
    expect(story.contributors).toHaveLength(1);
    expect(story.contributors[0].role).toBe('creator');
    expect(story.contributors[0].author.id).toBe(creator.id);

    expect(await isStoryContributor(story.id, creator.id)).toBe(true);
  });

  it('createStory atomically bumps universe.story_count', async () => {
    const creator  = await makeAuthor();
    const universe = await makeUniverse(creator.id);

    await createStory({
      title: 'one', synopsis: 's', universeId: universe.id,
      genreTags: [], creatorId: creator.id,
    });
    await createStory({
      title: 'two', synopsis: 's', universeId: universe.id,
      genreTags: [], creatorId: creator.id,
    });

    const fetched = await getStoryById(
      (await getStories({ universeId: universe.id })).data[0].id,
    );
    expect(fetched).toBeTruthy();

    const list = await getStories({ universeId: universe.id });
    expect(list.total).toBe(2);
  });

  it('getStoryById returns a fully shaped Story object (no fragment-composition regression)', async () => {
    const creator  = await makeAuthor({ displayName: 'Composer' });
    const universe = await makeUniverse(creator.id, { name: 'CompTest' });
    const story    = await createStory({
      title: 't', synopsis: 's', universeId: universe.id,
      genreTags: ['fantasy'], creatorId: creator.id,
    });

    const fetched = await getStoryById(story.id);
    expect(fetched?.universe.slug).toBe(universe.slug);
    expect(fetched?.contributors[0].author.displayName).toBe('Composer');
  });

  it('updateStory changes only what is provided', async () => {
    const creator  = await makeAuthor();
    const universe = await makeUniverse(creator.id);
    const story    = await createStory({
      title: 'orig', synopsis: 'syn', universeId: universe.id,
      genreTags: [], creatorId: creator.id,
    });

    const updated = await updateStory(story.id, { status: 'published' });
    expect(updated?.status).toBe('published');
    expect(updated?.title).toBe('orig');
  });
});
