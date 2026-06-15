import { request } from '@playwright/test';

// Cold `next dev` compiles each route on its first hit, which can take many
// seconds and blow per-action timeouts — so the first test to touch a route
// flakes. This warms the routes the suite uses (after waiting for the server to
// answer) so every test runs against already-compiled routes. All warming is
// best-effort; real failures still surface in the tests themselves.
const BASE = 'http://localhost:3000';

export default async function globalSetup() {
  const ctx = await request.newContext({ baseURL: BASE });
  const warm = async (fn: () => Promise<unknown>) => { try { await fn(); } catch { /* non-fatal */ } };

  // 1) Wait until the dev server responds at all (covers slow first boot).
  const start = Date.now();
  while (Date.now() - start < 180_000) {
    try {
      const r = await ctx.get('/', { timeout: 5_000 });
      if (r.status() < 500) break;
    } catch { /* not up yet */ }
    await new Promise(res => setTimeout(res, 1_000));
  }

  // 2) Compile the routes the suite exercises. Generous timeouts absorb the
  //    one-time compile cost; a 400/401/redirect still means the route compiled.
  await warm(() => ctx.get('/login',                         { timeout: 120_000 }));
  await warm(() => ctx.get('/register',                      { timeout: 120_000 }));
  await warm(() => ctx.get('/profile/edit',                  { timeout: 120_000 }));
  await warm(() => ctx.get('/api/auth/csrf',                 { timeout: 120_000 }));
  await warm(() => ctx.get('/api/auth/session',             { timeout: 120_000 }));
  // Compile the FULL credentials sign-in path (register → csrf → callback) so the
  // first browser sign-in in the auth specs runs warm instead of timing out.
  await warm(async () => {
    const u = { displayName: 'Warmup User', email: 'warmup@warmup.test', password: 'password123' };
    await ctx.post('/api/auth/register', { data: u, timeout: 120_000 });           // 201 or 409
    const csrf = (await (await ctx.get('/api/auth/csrf', { timeout: 120_000 })).json()).csrfToken;
    await ctx.post('/api/auth/callback/credentials', {
      form: { csrfToken: csrf, email: u.email, password: u.password, callbackUrl: BASE, json: 'true' },
      timeout: 120_000,
    });
  });
  await warm(() => ctx.get('/api/universes?page=1&limit=1',  { timeout: 120_000 }));
  await warm(() => ctx.get('/api/authors?page=1',            { timeout: 120_000 }));
  await warm(() => ctx.get('/api/reactions?targetIds=00000000-0000-0000-0000-000000000000', { timeout: 120_000 }));
  await warm(async () => {
    const res = await ctx.get('/api/stories?page=1&limit=1', { timeout: 120_000 });
    const id  = (await res.json())?.data?.[0]?.id;
    if (id) {
      await ctx.get(`/api/stories/${id}`, { timeout: 120_000 });
      await ctx.get(`/stories/${id}`,     { timeout: 120_000 }); // dynamic detail route
    }
  });

  await ctx.dispose();
}
