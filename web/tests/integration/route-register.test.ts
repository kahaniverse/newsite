import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ensureSchema, truncateAll, sql } from './db';

// The route reads from the rate-limit + Redis. Stub those to no-ops so the test
// doesn't require Redis to be up just to exercise the SQL path.
vi.mock('@/lib/redis/ratelimit', () => ({
  checkRateLimit:    async () => ({ success: true }),
  rateLimitIdentity: () => 'ip:test',
}));
vi.mock('@/lib/auth/turnstile', () => ({
  verifyTurnstile: async () => true,
}));

async function importRoute() {
  return await import('@/app/api/auth/register/route');
}

function postJson(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/register', {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeAll(async () => { await ensureSchema(); });
  beforeEach(async () => { await truncateAll(); });

  it('creates an author with a bcrypt-stored password_hash', async () => {
    const { POST } = await importRoute();
    const res  = await POST(postJson({
      displayName: 'Reggie',
      email:       'reggie@example.com',
      password:    'hunter2hunter2',
    }));
    expect(res.status).toBe(201);

    const rows = await sql`
      SELECT display_name, password_hash FROM authors WHERE auth_id = 'email:reggie@example.com'
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].display_name).toBe('Reggie');
    const hash = rows[0].password_hash as string;
    expect(hash).toMatch(/^\$2[aby]\$/);   // bcrypt prefix
  });

  it('returns 409 when the email is already registered', async () => {
    const { POST } = await importRoute();
    const first  = { displayName: 'AliceFirst', email: 'dup@example.com', password: 'password123' };
    const second = { displayName: 'AliceSecond', email: 'dup@example.com', password: 'password123' };
    const r1 = await POST(postJson(first));
    expect(r1.status).toBe(201);
    const r2 = await POST(postJson(second));
    expect(r2.status).toBe(409);
    expect((await r2.json()).code).toBe('DUPLICATE');
  });

  it('returns 409 on duplicate pen name (case-insensitive)', async () => {
    const { POST } = await importRoute();
    await POST(postJson({ displayName: 'Solo', email: 'a@x.com', password: 'password123' }));
    const second = await POST(postJson({ displayName: 'SOLO', email: 'b@x.com', password: 'password123' }));
    expect(second.status).toBe(409);
    expect((await second.json()).code).toBe('DUPLICATE_NAME');
  });

  it('returns 400 on validation failure', async () => {
    const { POST } = await importRoute();
    const res = await POST(postJson({ displayName: 'x', email: 'not-an-email', password: 'short' }));
    expect(res.status).toBe(400);
  });
});
