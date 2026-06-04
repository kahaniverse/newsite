import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ensureSchema, truncateAll, makeAuthor, makeUniverse, makeStory, makePage } from './db';

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
vi.mock('next/cache', () => ({ revalidateTag: () => {} }));

async function listRoute() { return import('@/app/api/stories/route'); }
async function idRoute() { return import('@/app/api/stories/[id]/route'); }
async function pagesRoute() { return import('@/app/api/stories/[id]/pages/route'); }

function getReq(url: string): NextRequest { return new NextRequest(`http://localhost${url}`); }
function jsonReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

describe('/api/stories', () => {
  beforeAll(async () => { await ensureSchema(); });
  beforeEach(async () => { await truncateAll(); userIdHolder.id = ''; });

  describe('GET (list)', () => {
    it('defaults to published status', async () => {
      const creator = await makeAuthor();
      const u = await makeUniverse(creator.id);
      await makeStory(u.id, creator.id, { status: 'published', title: 'Pub' });
      await makeStory(u.id, creator.id, { status: 'draft', title: 'Draft' });
      const { GET } = await listRoute();
      const json = await (await GET(getReq('/api/stories'))).json();
      expect(json.total).toBe(1);
      expect(json.data[0].title).toBe('Pub');
    });

    it('400s on an unknown status', async () => {
      const { GET } = await listRoute();
      const res = await GET(getReq('/api/stories?status=bogus'));
      expect(res.status).toBe(400);
    });

    it('filters by universeId', async () => {
      const creator = await makeAuthor();
      const u1 = await makeUniverse(creator.id, { slug: 'a' });
      const u2 = await makeUniverse(creator.id, { slug: 'b' });
      await makeStory(u1.id, creator.id);
      await makeStory(u2.id, creator.id);
      const { GET } = await listRoute();
      const json = await (await GET(getReq(`/api/stories?universeId=${u1.id}`))).json();
      expect(json.total).toBe(1);
    });
  });

  describe('POST (create)', () => {
    it('401s when unauthenticated', async () => {
      const { POST } = await listRoute();
      const res = await POST(jsonReq('/api/stories', 'POST', {}));
      expect(res.status).toBe(401);
    });

    it('creates a story with the caller as creator contributor', async () => {
      const creator = await makeAuthor();
      const u = await makeUniverse(creator.id);
      userIdHolder.id = creator.id;
      const { POST } = await listRoute();
      const res = await POST(jsonReq('/api/stories', 'POST', {
        title: 'New Tale', synopsis: 'A start.', universeId: u.id, genreTags: ['fantasy'],
      }));
      expect(res.status).toBe(201);
      const s = await res.json();
      expect(s.title).toBe('New Tale');
      expect(s.contributors[0].author.id).toBe(creator.id);
      expect(s.contributors[0].role).toBe('creator');
    });

    it('400s on validation failure (missing universeId)', async () => {
      const creator = await makeAuthor();
      userIdHolder.id = creator.id;
      const { POST } = await listRoute();
      const res = await POST(jsonReq('/api/stories', 'POST', { title: 'x', synopsis: 'y', genreTags: [] }));
      expect(res.status).toBe(400);
    });
  });

  describe('[id] GET/PATCH', () => {
    it('GET 404s for an unknown id', async () => {
      const { GET } = await idRoute();
      const res = await GET(getReq('/api/stories/00000000-0000-0000-0000-000000000000'), {
        params: { id: '00000000-0000-0000-0000-000000000000' },
      });
      expect(res.status).toBe(404);
    });

    it('PATCH is contributor-only (403 for a stranger)', async () => {
      const creator  = await makeAuthor();
      const stranger = await makeAuthor();
      const u = await makeUniverse(creator.id);
      const s = await makeStory(u.id, creator.id);
      userIdHolder.id = stranger.id;
      const { PATCH } = await idRoute();
      const res = await PATCH(jsonReq(`/api/stories/${s.id}`, 'PATCH', { status: 'completed' }), { params: { id: s.id } });
      expect(res.status).toBe(403);
    });

    it('PATCH updates status for a contributor', async () => {
      const creator = await makeAuthor();
      const u = await makeUniverse(creator.id);
      const s = await makeStory(u.id, creator.id, { status: 'draft' });
      userIdHolder.id = creator.id;
      const { PATCH } = await idRoute();
      const res = await PATCH(jsonReq(`/api/stories/${s.id}`, 'PATCH', { status: 'published' }), { params: { id: s.id } });
      expect(res.status).toBe(200);
      expect((await res.json()).status).toBe('published');
    });
  });

  describe('[id]/pages GET', () => {
    it('returns pages in creation order', async () => {
      const creator = await makeAuthor();
      const u = await makeUniverse(creator.id);
      const s = await makeStory(u.id, creator.id);
      const root = await makePage(s.id, creator.id, { content: 'root' });
      await makePage(s.id, creator.id, { parentId: root.id, content: 'child' });
      const { GET } = await pagesRoute();
      const json = await (await GET(getReq(`/api/stories/${s.id}/pages`), { params: { id: s.id } })).json();
      expect(json.data).toHaveLength(2);
      expect(json.data[0].content).toBe('root');
    });
  });
});
