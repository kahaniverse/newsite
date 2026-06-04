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

async function postRoute() { return import('@/app/api/pages/route'); }
async function idRoute()   { return import('@/app/api/pages/[id]/route'); }

function getReq(url: string): NextRequest { return new NextRequest(`http://localhost${url}`); }
function jsonReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

describe('/api/pages', () => {
  beforeAll(async () => { await ensureSchema(); });
  beforeEach(async () => { await truncateAll(); userIdHolder.id = ''; });

  describe('POST (create child page)', () => {
    it('401s when unauthenticated', async () => {
      const { POST } = await postRoute();
      const res = await POST(jsonReq('/api/pages', 'POST', {}));
      expect(res.status).toBe(401);
    });

    it('creates a child page parented to the root', async () => {
      const author = await makeAuthor();
      const u = await makeUniverse(author.id);
      const s = await makeStory(u.id, author.id);
      const root = await makePage(s.id, author.id, { content: 'root' });
      userIdHolder.id = author.id;
      const { POST } = await postRoute();
      const res = await POST(jsonReq('/api/pages', 'POST', {
        storyId: s.id, parentId: root.id, content: 'A branch continues.',
      }));
      expect(res.status).toBe(201);
      const page = await res.json();
      expect(page.parentId).toBe(root.id);
      expect(page.author.id).toBe(author.id);
    });

    it('400s when parentId is not a uuid', async () => {
      const author = await makeAuthor();
      userIdHolder.id = author.id;
      const { POST } = await postRoute();
      const res = await POST(jsonReq('/api/pages', 'POST', {
        storyId: '00000000-0000-0000-0000-000000000000', parentId: 'nope', content: 'x',
      }));
      expect(res.status).toBe(400);
    });

    it('400s when content is empty', async () => {
      const author = await makeAuthor();
      userIdHolder.id = author.id;
      const { POST } = await postRoute();
      const res = await POST(jsonReq('/api/pages', 'POST', {
        storyId: '00000000-0000-0000-0000-000000000000',
        parentId: '00000000-0000-0000-0000-000000000000',
        content: '',
      }));
      expect(res.status).toBe(400);
    });
  });

  describe('[id] GET/PATCH', () => {
    it('GET returns the page with its children', async () => {
      const author = await makeAuthor();
      const u = await makeUniverse(author.id);
      const s = await makeStory(u.id, author.id);
      const root = await makePage(s.id, author.id, { content: 'root' });
      await makePage(s.id, author.id, { parentId: root.id, content: 'child' });
      const { GET } = await idRoute();
      const res = await GET(getReq(`/api/pages/${root.id}`), { params: { id: root.id } });
      expect(res.status).toBe(200);
      const page = await res.json();
      expect(page.children).toHaveLength(1);
    });

    it('GET 404s for an unknown id', async () => {
      const { GET } = await idRoute();
      const id = '00000000-0000-0000-0000-000000000000';
      const res = await GET(getReq(`/api/pages/${id}`), { params: { id } });
      expect(res.status).toBe(404);
    });

    it('PATCH is author-only (403 for a stranger)', async () => {
      const author   = await makeAuthor();
      const stranger = await makeAuthor();
      const u = await makeUniverse(author.id);
      const s = await makeStory(u.id, author.id);
      const root = await makePage(s.id, author.id, { content: 'root' });
      userIdHolder.id = stranger.id;
      const { PATCH } = await idRoute();
      const res = await PATCH(jsonReq(`/api/pages/${root.id}`, 'PATCH', { content: 'hijacked' }), { params: { id: root.id } });
      expect(res.status).toBe(403);
    });

    it('PATCH updates content for the author', async () => {
      const author = await makeAuthor();
      const u = await makeUniverse(author.id);
      const s = await makeStory(u.id, author.id);
      const root = await makePage(s.id, author.id, { content: 'before' });
      userIdHolder.id = author.id;
      const { PATCH } = await idRoute();
      const res = await PATCH(jsonReq(`/api/pages/${root.id}`, 'PATCH', { content: 'after' }), { params: { id: root.id } });
      expect(res.status).toBe(200);
      expect((await res.json()).content).toBe('after');
    });
  });
});
