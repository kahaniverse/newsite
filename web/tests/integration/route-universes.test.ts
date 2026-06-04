import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ensureSchema, truncateAll, makeAuthor, makeUniverse, makeStory } from './db';

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
// Keep CacheKeys/TTL real; stub the network-bound cache ops so Redis isn't required.
vi.mock('@/lib/redis/cache', async (orig) => ({
  ...(await orig<typeof import('@/lib/redis/cache')>()),
  getCache:        async () => null,
  setCache:        async () => {},
  invalidateCache: async () => {},
}));
vi.mock('next/cache', () => ({ revalidateTag: () => {} }));

async function listRoute() { return import('@/app/api/universes/route'); }
async function slugRoute() { return import('@/app/api/universes/[slug]/route'); }
async function storiesRoute() { return import('@/app/api/universes/[slug]/stories/route'); }

function getReq(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`);
}
function jsonReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name:       'Nebula Drift',
  concept:    'A drifting station at the edge of charted space.',
  coverImage: 'http://localhost:3000/images/x.jpeg',
  genres:     ['scienceFiction'],
};

describe('/api/universes', () => {
  beforeAll(async () => { await ensureSchema(); });
  beforeEach(async () => { await truncateAll(); userIdHolder.id = ''; });

  describe('GET (list)', () => {
    it('returns paginated data with hasMore=false when nothing exists', async () => {
      const { GET } = await listRoute();
      const res = await GET(getReq('/api/universes'));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual([]);
      expect(json.total).toBe(0);
      expect(json.hasMore).toBe(false);
      expect(json.page).toBe(1);
    });

    it('400s on an unknown genre filter', async () => {
      const { GET } = await listRoute();
      const res = await GET(getReq('/api/universes?genre=notreal'));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe('VALIDATION');
    });

    it('filters by genre when valid', async () => {
      const creator = await makeAuthor();
      await makeUniverse(creator.id, { name: 'Sci', slug: 'sci' }); // genres=[scienceFiction]
      const { GET } = await listRoute();
      const sci = await (await GET(getReq('/api/universes?genre=scienceFiction'))).json();
      expect(sci.total).toBe(1);
      const fant = await (await GET(getReq('/api/universes?genre=fantasy'))).json();
      expect(fant.total).toBe(0);
    });

    it('featured=true excludes universes with no stories', async () => {
      const creator = await makeAuthor();
      const withStory = await makeUniverse(creator.id, { slug: 'has-story' });
      await makeUniverse(creator.id, { slug: 'no-story' });
      await makeStory(withStory.id, creator.id);
      const { GET } = await listRoute();
      const json = await (await GET(getReq('/api/universes?featured'))).json();
      expect(json.data.map((u: { slug: string }) => u.slug)).toEqual(['has-story']);
    });

    it('count=true returns just the total', async () => {
      const creator = await makeAuthor();
      await makeUniverse(creator.id);
      const { GET } = await listRoute();
      const json = await (await GET(getReq('/api/universes?count'))).json();
      expect(json).toEqual({ total: 1 });
    });
  });

  describe('POST (create)', () => {
    it('401s when unauthenticated', async () => {
      const { POST } = await listRoute();
      const res = await POST(jsonReq('/api/universes', 'POST', validBody));
      expect(res.status).toBe(401);
    });

    it('creates a universe and derives a slug from the name', async () => {
      const creator = await makeAuthor();
      userIdHolder.id = creator.id;
      const { POST } = await listRoute();
      const res = await POST(jsonReq('/api/universes', 'POST', validBody));
      expect(res.status).toBe(201);
      const u = await res.json();
      expect(u.name).toBe('Nebula Drift');
      expect(u.slug).toBe('nebula-drift');
      expect(u.creator.id).toBe(creator.id);
    });

    it('400s on validation failure (bad coverImage url)', async () => {
      const creator = await makeAuthor();
      userIdHolder.id = creator.id;
      const { POST } = await listRoute();
      const res = await POST(jsonReq('/api/universes', 'POST', { ...validBody, coverImage: 'not-a-url' }));
      expect(res.status).toBe(400);
    });

    it('409s on a duplicate slug', async () => {
      const creator = await makeAuthor();
      userIdHolder.id = creator.id;
      const { POST } = await listRoute();
      expect((await POST(jsonReq('/api/universes', 'POST', validBody))).status).toBe(201);
      const dup = await POST(jsonReq('/api/universes', 'POST', validBody));
      expect(dup.status).toBe(409);
      expect((await dup.json()).code).toBe('DUPLICATE');
    });
  });

  describe('[slug] GET/PATCH/DELETE', () => {
    it('GET 404s for an unknown slug', async () => {
      const { GET } = await slugRoute();
      const res = await GET(getReq('/api/universes/ghost'), { params: { slug: 'ghost' } });
      expect(res.status).toBe(404);
    });

    it('PATCH is creator-only (403 for a stranger)', async () => {
      const creator  = await makeAuthor();
      const stranger = await makeAuthor();
      const u = await makeUniverse(creator.id, { slug: 'owned' });
      userIdHolder.id = stranger.id;
      const { PATCH } = await slugRoute();
      const res = await PATCH(jsonReq(`/api/universes/${u.slug}`, 'PATCH', { name: 'Hijack' }), { params: { slug: u.slug } });
      expect(res.status).toBe(403);
    });

    it('PATCH updates a field for the creator', async () => {
      const creator = await makeAuthor();
      const u = await makeUniverse(creator.id, { slug: 'mine', name: 'Old' });
      userIdHolder.id = creator.id;
      const { PATCH } = await slugRoute();
      const res = await PATCH(jsonReq(`/api/universes/${u.slug}`, 'PATCH', { concept: 'A new concept' }), { params: { slug: u.slug } });
      expect(res.status).toBe(200);
      expect((await res.json()).concept).toBe('A new concept');
    });

    it('DELETE removes the universe for the creator (204)', async () => {
      const creator = await makeAuthor();
      const u = await makeUniverse(creator.id, { slug: 'doomed' });
      userIdHolder.id = creator.id;
      const { DELETE, GET } = await slugRoute();
      const del = await DELETE(getReq(`/api/universes/${u.slug}`), { params: { slug: u.slug } });
      expect(del.status).toBe(204);
      const after = await GET(getReq(`/api/universes/${u.slug}`), { params: { slug: u.slug } });
      expect(after.status).toBe(404);
    });

    it('DELETE is creator-only (403 for a stranger)', async () => {
      const creator  = await makeAuthor();
      const stranger = await makeAuthor();
      const u = await makeUniverse(creator.id, { slug: 'guarded' });
      userIdHolder.id = stranger.id;
      const { DELETE } = await slugRoute();
      const res = await DELETE(getReq(`/api/universes/${u.slug}`), { params: { slug: u.slug } });
      expect(res.status).toBe(403);
    });
  });

  describe('[slug]/stories GET', () => {
    it('404s for an unknown universe', async () => {
      const { GET } = await storiesRoute();
      const res = await GET(getReq('/api/universes/ghost/stories'), { params: { slug: 'ghost' } });
      expect(res.status).toBe(404);
    });

    it('returns only published stories for the universe', async () => {
      const creator = await makeAuthor();
      const u = await makeUniverse(creator.id, { slug: 'world' });
      await makeStory(u.id, creator.id, { status: 'published', title: 'Live' });
      await makeStory(u.id, creator.id, { status: 'draft', title: 'Hidden' });
      const { GET } = await storiesRoute();
      const json = await (await GET(getReq(`/api/universes/${u.slug}/stories`), { params: { slug: u.slug } })).json();
      expect(json.total).toBe(1);
      expect(json.data[0].title).toBe('Live');
    });
  });
});
