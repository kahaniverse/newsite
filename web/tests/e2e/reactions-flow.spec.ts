import { test, expect, loginViaApi } from './fixtures';
import type { BrowserContext } from '@playwright/test';

// Full two-user UX + data scan of reactions against the real dev stack. Proves
// that one viewer's reaction is isolated to that viewer (the red/active flag is
// per-user) while the COUNT is shared/global — i.e. a like by A must not flip B's
// glyph, and B must still see the count A produced.
const ALICE = { displayName: 'QA Alice', email: 'qa-alice@kahaniverse.test', password: 'password123' };
const BOB   = { displayName: 'QA Bob',   email: 'qa-bob@kahaniverse.test',   password: 'password123' };
const MOBILE = { width: 390, height: 844 }; // narrow shell → one reaction strip per entity (deterministic)

type Ctx = BrowserContext;
const state = async (c: Ctx, id: string) => {
  const { states } = await (await c.request.get(`/api/reactions?targetIds=${id}`)).json();
  return states.find((s: { targetId: string }) => s.targetId === id) ?? { targetId: id, myLove: false, myFollow: false };
};
const loveCount = async (c: Ctx, id: string) =>
  (await (await c.request.get(`/api/stories/${id}`)).json()).loveCount as number;
const viewCount = async (c: Ctx, id: string) =>
  (await (await c.request.get(`/api/stories/${id}`)).json()).viewCount as number;
const toggleLove = async (c: Ctx, id: string) =>
  (await (await c.request.post('/api/reactions', { data: { type: 'love', targetType: 'story', targetId: id } })).json()).result;
const recordView = async (c: Ctx, id: string) =>
  (await (await c.request.post('/api/reactions', { data: { type: 'view', targetType: 'story', targetId: id } })).json()).result;

test('following an author from the list increments the count and toggles state', async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: 'http://localhost:3000', viewport: MOBILE });
  const page = await ctx.newPage();
  try {
    await loginViaApi(ctx, ALICE);
    await page.goto('/authors');

    const followBtn = page.getByTestId('author-follow').first();
    await followBtn.waitFor();
    const countText = () => page.getByText(/followers/i).first().innerText();
    const num = async () => parseInt((await countText()).replace(/[^0-9]/g, ''), 10);

    // Normalize to "not following" so the run is deterministic.
    if ((await followBtn.getAttribute('aria-pressed')) === 'true') {
      await followBtn.click();
      await expect(followBtn).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(followBtn).toHaveText(/^follow$/i);
    const before = await num();

    // Follow → state flips to "Following" (colour change) and the count goes up 1.
    await followBtn.click();
    await expect(followBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(followBtn).toHaveText(/following/i);
    expect(await num()).toBe(before + 1);

    // Unfollow → back to baseline (also leaves the dev data clean).
    await followBtn.click();
    await expect(followBtn).toHaveAttribute('aria-pressed', 'false');
    expect(await num()).toBe(before);
  } finally {
    await ctx.close();
  }
});

test('reaction by one user does not affect another; counts are shared', async ({ browser }) => {
  const ctxA = await browser.newContext({ baseURL: 'http://localhost:3000', viewport: MOBILE });
  const ctxB = await browser.newContext({ baseURL: 'http://localhost:3000', viewport: MOBILE });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    await loginViaApi(ctxA, ALICE);
    await loginViaApi(ctxB, BOB);

    // A seeded story (big baseline love_count, no rows) — the case that broke.
    const story = (await (await ctxA.request.get('/api/stories?page=1&limit=1')).json()).data[0];
    const id = story.id as string;

    // Normalize: make sure neither user currently likes it (clean re-runs).
    if ((await state(ctxA, id)).myLove) await toggleLove(ctxA, id);
    if ((await state(ctxB, id)).myLove) await toggleLove(ctxB, id);
    const L0 = await loveCount(ctxA, id);
    expect(L0).toBeGreaterThan(0); // seeded baseline preserved (not collapsed to 0)

    // ── A likes ──────────────────────────────────────────────────────────
    expect(await toggleLove(ctxA, id)).toBe('added');
    expect(await loveCount(ctxA, id)).toBe(L0 + 1);            // count is global
    expect((await state(ctxA, id)).myLove).toBe(true);         // A reacted
    expect((await state(ctxB, id)).myLove).toBe(false);        // B did NOT — isolated

    // UX: A's detail shows the heart filled; B's shows the SAME count but not filled.
    await pageA.goto(`/stories/${id}`);
    await expect(pageA.getByRole('button', { name: `Love — ${L0 + 1}` })).toHaveAttribute('aria-pressed', 'true');
    await pageB.goto(`/stories/${id}`);
    await expect(pageB.getByRole('button', { name: `Love — ${L0 + 1}` })).toHaveAttribute('aria-pressed', 'false');

    // ── B likes too ──────────────────────────────────────────────────────
    expect(await toggleLove(ctxB, id)).toBe('added');
    expect(await loveCount(ctxB, id)).toBe(L0 + 2);
    expect((await state(ctxA, id)).myLove).toBe(true);         // A unaffected by B
    expect((await state(ctxB, id)).myLove).toBe(true);

    // ── A un-likes — must not touch B's reaction ─────────────────────────
    expect(await toggleLove(ctxA, id)).toBe('removed');
    expect(await loveCount(ctxA, id)).toBe(L0 + 1);
    expect((await state(ctxA, id)).myLove).toBe(false);
    expect((await state(ctxB, id)).myLove).toBe(true);         // B's like survived A's un-like

    // UX after the dust settles: A not filled, B filled — same shared count.
    await pageA.goto(`/stories/${id}`);
    await expect(pageA.getByRole('button', { name: `Love — ${L0 + 1}` })).toHaveAttribute('aria-pressed', 'false');
    await pageB.goto(`/stories/${id}`);
    await expect(pageB.getByRole('button', { name: `Love — ${L0 + 1}` })).toHaveAttribute('aria-pressed', 'true');

    // ── Views: unique per viewer, shared count (robust to prior runs, since a
    // recorded view can't be undone) ─────────────────────────────────────
    const V0 = await viewCount(ctxA, id);
    const aFirst = await recordView(ctxA, id);                  // 'added' if A never viewed, else 'noop'
    const bFirst = await recordView(ctxB, id);                  // distinct viewer (separate dedup key)
    const expectedDelta = (aFirst === 'added' ? 1 : 0) + (bFirst === 'added' ? 1 : 0);
    expect(await viewCount(ctxA, id)).toBe(V0 + expectedDelta); // count rises only for NEW unique viewers
    // A viewing again (past the 1s dedup lock) never counts a second time.
    await pageA.waitForTimeout(1100);
    expect(await recordView(ctxA, id)).toBe('noop');
    expect(await viewCount(ctxA, id)).toBe(V0 + expectedDelta); // unchanged

    // ── Cleanup: restore love to baseline (B un-likes) ───────────────────
    await toggleLove(ctxB, id);
    expect(await loveCount(ctxA, id)).toBe(L0);
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});
