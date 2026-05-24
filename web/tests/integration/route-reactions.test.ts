import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ensureSchema, truncateAll, makeAuthor, makeUniverse } from './db';

const reactorIdHolder = { id: '' };

vi.mock('@/lib/redis/ratelimit', () => ({
  checkRateLimit:    async () => ({ success: true }),
  rateLimitIdentity: () => 'ip:test',
}));
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: async () => ({
    session: { user: { id: reactorIdHolder.id, name: 'Tester' } },
    error:   null,
  }),
}));

// In-memory NX lock without auto-expiry. Tests release manually via lockedKeys.clear().
const lockedKeys = new Set<string>();
vi.mock('@/lib/redis/client', () => ({
  redis: {
    set: async (key: string, _val: string, opts?: { nx?: boolean }) => {
      if (opts?.nx && lockedKeys.has(key)) return null;
      lockedKeys.add(key);
      return 'OK';
    },
    del: async (key: string) => {
      lockedKeys.delete(key);
      return 1;
    },
  },
}));

async function importRoute() {
  return await import('@/app/api/reactions/route');
}

function postJson(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/reactions', {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

describe('POST /api/reactions', () => {
  beforeAll(async () => { await ensureSchema(); });
  beforeEach(async () => {
    await truncateAll();
    lockedKeys.clear();
  });

  it('toggles love on a universe: added → removed', async () => {
    const { POST } = await importRoute();
    const reactor  = await makeAuthor();
    reactorIdHolder.id = reactor.id;
    const creator  = await makeAuthor();
    const universe = await makeUniverse(creator.id);

    const r1 = await POST(postJson({ type: 'love', targetType: 'universe', targetId: universe.id }));
    expect(r1.status).toBe(200);
    expect((await r1.json()).result).toBe('added');

    // Release the dedup lock to simulate the TTL elapsing in real Redis.
    lockedKeys.clear();

    const r2 = await POST(postJson({ type: 'love', targetType: 'universe', targetId: universe.id }));
    expect((await r2.json()).result).toBe('removed');
  });

  it('rate-limits rapid duplicate clicks via the NX lock', async () => {
    const { POST } = await importRoute();
    const reactor  = await makeAuthor();
    reactorIdHolder.id = reactor.id;
    const creator  = await makeAuthor();
    const universe = await makeUniverse(creator.id);

    // No lockedKeys.clear() between calls — the second hit must collide.
    const r1 = await POST(postJson({ type: 'love', targetType: 'universe', targetId: universe.id }));
    expect(r1.status).toBe(200);
    const r2 = await POST(postJson({ type: 'love', targetType: 'universe', targetId: universe.id }));
    expect(r2.status).toBe(429);
  });

  it('validates targetId as UUID', async () => {
    const { POST } = await importRoute();
    reactorIdHolder.id = '00000000-0000-0000-0000-000000000000';
    const res = await POST(postJson({ type: 'love', targetType: 'universe', targetId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });
});
