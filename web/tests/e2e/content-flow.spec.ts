import { test, expect, registerNewUser, randomTag } from './fixtures';

// Exercises the full author→reader chain: create a universe and a story through
// the API (sharing the browser's auth cookie), then read the story in the UI.
test.describe('content flow', () => {
  test('a created story renders on its reader page', async ({ page }) => {
    await registerNewUser(page);
    const tag      = randomTag();
    const synopsis = `A tale spun up by Playwright ${tag}.`;

    const uRes = await page.request.post('/api/universes', {
      data: {
        name:       `World ${tag}`,
        concept:    'A world for story reading.',
        coverImage: 'http://localhost:3000/images/exodus.jpeg',
        genres:     ['scienceFiction'],
      },
    });
    expect(uRes.status()).toBe(201);
    const universe = await uRes.json();

    const sRes = await page.request.post('/api/stories', {
      data: {
        title:      `Reader Tale ${tag}`,
        synopsis,
        universeId: universe.id,
        genreTags:  ['scienceFiction'],
      },
    });
    expect(sRes.status()).toBe(201);
    const story = await sRes.json();
    expect(story.contributors[0].author.id).toBe(universe.creator.id);

    // Read it back in the browser — the story page is a NarrowShell that renders
    // at desktop width, so the synopsis should be visible.
    await page.goto(`/stories/${story.id}`);
    await expect(page.getByText(synopsis)).toBeVisible();
    await expect(page.getByText(`Reader Tale ${tag}`).first()).toBeVisible();
  });

  test('GET /api/stories/[id]/pages returns the branch chain', async ({ page }) => {
    await registerNewUser(page);
    const tag = randomTag();

    const universe = await (await page.request.post('/api/universes', {
      data: { name: `Branches ${tag}`, concept: 'c', coverImage: 'http://localhost:3000/images/exodus.jpeg', genres: ['fantasy'] },
    })).json();
    const story = await (await page.request.post('/api/stories', {
      data: { title: `Branchy ${tag}`, synopsis: 's', universeId: universe.id, genreTags: ['fantasy'] },
    })).json();

    // No pages yet — the endpoint should still answer with an empty list.
    const empty = await page.request.get(`/api/stories/${story.id}/pages`);
    expect(empty.status()).toBe(200);
    expect((await empty.json()).data).toEqual([]);
  });
});
