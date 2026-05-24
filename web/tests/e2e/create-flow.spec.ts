import { test, expect, registerNewUser, randomTag } from './fixtures';

test.describe('create flow', () => {
  test('signed-in user can create a universe via the API and find it in /api/universes', async ({ page }) => {
    await registerNewUser(page);
    const tag  = randomTag();
    const name = `Test Universe ${tag}`;

    // page.request shares cookies with the page's browser context — the standalone
    // `request` fixture does not, so it would 401 even after sign-in.
    const create = await page.request.post('/api/universes', {
      data: {
        name,
        concept:    'A test universe spun up by Playwright.',
        coverImage: 'http://localhost:3000/images/exodus.jpeg',
        genres:     ['scienceFiction'],
      },
    });
    expect(create.status()).toBe(201);
    const universe = await create.json();
    expect(universe.name).toBe(name);

    const list = await page.request.get(`/api/universes?q=${encodeURIComponent(tag)}`);
    expect(list.status()).toBe(200);
    const json = await list.json();
    expect(json.data.find((u: { name: string }) => u.name === name)).toBeTruthy();
  });

  test('reactions endpoint toggles a love on a universe', async ({ page }) => {
    await registerNewUser(page);

    const created = await page.request.post('/api/universes', {
      data: {
        name:       `Lovable ${randomTag()}`,
        concept:    'react to me',
        coverImage: 'http://localhost:3000/images/exodus.jpeg',
        genres:     ['fantasy'],
      },
    });
    const universe = await created.json();

    const r1 = await page.request.post('/api/reactions', {
      data: { type: 'love', targetType: 'universe', targetId: universe.id },
    });
    expect(r1.status()).toBe(200);
    expect((await r1.json()).result).toBe('added');

    // Brief pause for the dedup-lock TTL (1s) to expire.
    await page.waitForTimeout(1100);

    const r2 = await page.request.post('/api/reactions', {
      data: { type: 'love', targetType: 'universe', targetId: universe.id },
    });
    expect((await r2.json()).result).toBe('removed');
  });
});
