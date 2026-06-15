import { test, expect, loginViaApi } from './fixtures';

// End-to-end: a follower is notified when a followed author creates new content.
const ALICE  = { displayName: 'QA Alice', email: 'qa-alice@kahaniverse.test', password: 'password123' };
const BOB    = { displayName: 'QA Bob',   email: 'qa-bob@kahaniverse.test',   password: 'password123' };
const MOBILE = { width: 390, height: 844 };

test('following an author notifies the follower when they publish a new universe', async ({ browser }) => {
  const ctxA = await browser.newContext({ baseURL: 'http://localhost:3000', viewport: MOBILE });
  const ctxB = await browser.newContext({ baseURL: 'http://localhost:3000', viewport: MOBILE });
  const pageB = await ctxB.newPage();
  try {
    const aliceId = await loginViaApi(ctxA, ALICE);
    await loginViaApi(ctxB, BOB);

    // Bob follows Alice.
    const f = await ctxB.request.post('/api/reactions', { data: { type: 'follow', targetType: 'author', targetId: aliceId } });
    expect(f.ok()).toBeTruthy();

    // Alice publishes a new universe.
    const name = `Followed World ${Date.now()}`;
    const res = await ctxA.request.post('/api/universes', {
      data: { name, concept: 'A world Bob is watching.', coverImage: 'http://localhost:3000/images/exodus.jpeg', genres: ['fantasy'] },
    });
    expect(res.status()).toBe(201);

    // Bob receives an unread "new universe" notification for it.
    await expect.poll(async () => {
      const { items, unread } = await (await ctxB.request.get('/api/notifications')).json();
      return unread > 0 && items.some((i: { type: string; title: string }) => i.type === 'new_universe' && i.title === name);
    }, { timeout: 10_000 }).toBe(true);

    // And it shows on Bob's notifications screen.
    await pageB.goto('/notifications');
    await expect(pageB.getByText(name).first()).toBeVisible();

    // Alice (the actor) is NOT notified of her own creation.
    const aliceNotifs = await (await ctxA.request.get('/api/notifications')).json();
    expect(aliceNotifs.items.some((i: { title: string }) => i.title === name)).toBe(false);
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});
