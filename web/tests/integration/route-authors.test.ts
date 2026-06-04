import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ensureSchema, truncateAll, makeAuthor } from './db';

const userIdHolder = { id: '' };

vi.mock('@/lib/redis/ratelimit', () => ({
  checkRateLimit:    async () => ({ success: true }),
  rateLimitIdentity: () => 'ip:test',
}));
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: async () =>
    userIdHolder.id
      ? { session: { user: { id: userIdHolder.id, name: 'Tester' } }, error: null }
      : { session: null, error: Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }) },
}));
// Real CacheKeys/TTL, stubbed cache ops (no Redis dependency).
vi.mock('@/lib/redis/cache', async (orig) => ({
  ...(await orig<typeof import('@/lib/redis/cache')>()),
  getCache:        async () => null,
  setCache:        async () => {},
  invalidateCache: async () => {},
}));

async function listRoute() { return import('@/app/api/authors/route'); }
async function idRoute()   { return import('@/app/api/authors/[id]/route'); }

function getReq(url: string): NextRequest { return new NextRequest(`http://localhost${url}`); }
function jsonReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

describe('/api/authors', () => {
  beforeAll(async () => { await ensureSchema(); });
  beforeEach(async () => { await truncateAll(); userIdHolder.id = ''; });

  describe('GET (list)', () => {
    it('returns authors with pagination metadata', async () => {
      await makeAuthor({ displayName: 'A' });
      await makeAuthor({ displayName: 'B' });
      const { GET } = await listRoute();
      const json = await (await GET(getReq('/api/authors'))).json();
      expect(json.total).toBe(2);
      expect(json.data).toHaveLength(2);
      expect(json.hasMore).toBe(false);
    });

    it('never leaks dob in the public shape', async () => {
      await makeAuthor();
      const { GET } = await listRoute();
      const json = await (await GET(getReq('/api/authors'))).json();
      expect(json.data[0]).not.toHaveProperty('dob');
      expect(json.data[0]).not.toHaveProperty('auth_id');
    });
  });

  describe('[id] GET/PATCH', () => {
    it('GET returns the author', async () => {
      const a = await makeAuthor({ displayName: 'Visible' });
      const { GET } = await idRoute();
      const res = await GET(getReq(`/api/authors/${a.id}`), { params: { id: a.id } });
      expect(res.status).toBe(200);
      expect((await res.json()).displayName).toBe('Visible');
    });

    it('GET 404s for an unknown id', async () => {
      const { GET } = await idRoute();
      const id = '00000000-0000-0000-0000-000000000000';
      const res = await GET(getReq(`/api/authors/${id}`), { params: { id } });
      expect(res.status).toBe(404);
    });

    it('PATCH is self-only (403 editing another author)', async () => {
      const me    = await makeAuthor();
      const other = await makeAuthor();
      userIdHolder.id = me.id;
      const { PATCH } = await idRoute();
      const res = await PATCH(jsonReq(`/api/authors/${other.id}`, 'PATCH', { bio: 'hax' }), { params: { id: other.id } });
      expect(res.status).toBe(403);
    });

    it('PATCH updates the caller’s own bio', async () => {
      const me = await makeAuthor();
      userIdHolder.id = me.id;
      const { PATCH } = await idRoute();
      const res = await PATCH(jsonReq(`/api/authors/${me.id}`, 'PATCH', { bio: 'Storyteller.' }), { params: { id: me.id } });
      expect(res.status).toBe(200);
      expect((await res.json()).bio).toBe('Storyteller.');
    });
  });
});
