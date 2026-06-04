import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { ensureSchema, truncateAll, sql } from './db';

// In-memory Redis so the SHA-256-hashed reset token round-trips without a server.
const store = new Map<string, string>();
vi.mock('@/lib/redis/client', () => ({
  redis: {
    setex: async (k: string, _ttl: number, v: string) => { store.set(k, v); return 'OK'; },
    get:   async (k: string) => store.get(k) ?? null,
    del:   async (k: string) => (store.delete(k) ? 1 : 0),
    set:   async () => 'OK',
  },
}));
vi.mock('@/lib/redis/ratelimit', () => ({
  checkRateLimit:    async () => ({ success: true }),
  rateLimitIdentity: () => 'ip:test',
}));

// Capture the outgoing reset email so the test can recover the cleartext token.
const sent: Array<{ to: string; html: string }> = [];
vi.mock('@/lib/email/client', () => ({
  sendEmail: async (msg: { to: string; html: string }) => { sent.push(msg); },
}));

async function forgotRoute() { return import('@/app/api/auth/forgot-password/route'); }
async function resetRoute()  { return import('@/app/api/auth/reset-password/route'); }

function postJson(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

async function seedCredentialUser(email: string, password: string): Promise<string> {
  const hash = await bcrypt.hash(password, 12);
  const rows = await sql`
    INSERT INTO authors (auth_id, display_name, password_hash)
    VALUES (${`email:${email}`}, 'Reset Tester', ${hash})
    RETURNING id
  `;
  return rows[0].id as string;
}

function tokenFromLastEmail(): string {
  const html = sent[sent.length - 1].html;
  const m = html.match(/token=([0-9a-f]+)/i);
  if (!m) throw new Error('no token in email');
  return m[1];
}

describe('password reset flow', () => {
  beforeAll(async () => { await ensureSchema(); });
  beforeEach(async () => { await truncateAll(); store.clear(); sent.length = 0; });

  it('forgot-password 400s on an invalid email', async () => {
    const { POST } = await forgotRoute();
    const res = await POST(postJson('/api/auth/forgot-password', { email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('forgot-password returns ok and sends NO email for an unknown address (no enumeration)', async () => {
    const { POST } = await forgotRoute();
    const res = await POST(postJson('/api/auth/forgot-password', { email: 'ghost@example.com' }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(sent).toHaveLength(0);
    expect(store.size).toBe(0);
  });

  it('forgot → reset updates the password hash and consumes the token', async () => {
    const email = 'reset@example.com';
    const authorId = await seedCredentialUser(email, 'oldpassword1');

    const { POST: forgot } = await forgotRoute();
    expect((await forgot(postJson('/api/auth/forgot-password', { email }))).status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(store.size).toBe(1);

    const token = tokenFromLastEmail();
    const { POST: reset } = await resetRoute();
    const res = await reset(postJson('/api/auth/reset-password', { token, password: 'brandnewpass9' }));
    expect(res.status).toBe(200);

    // Hash actually changed to the new password.
    const rows = await sql`SELECT password_hash FROM authors WHERE id = ${authorId}`;
    expect(await bcrypt.compare('brandnewpass9', rows[0].password_hash as string)).toBe(true);

    // Token is single-use: the redis key is gone.
    expect(store.size).toBe(0);

    // Re-using the same token now fails.
    const again = await reset(postJson('/api/auth/reset-password', { token, password: 'anotherpass9' }));
    expect(again.status).toBe(400);
    expect((await again.json()).code).toBe('TOKEN_INVALID');
  });

  it('reset-password 400s on a too-short password (validation)', async () => {
    const { POST } = await resetRoute();
    const res = await POST(postJson('/api/auth/reset-password', { token: 'a'.repeat(64), password: 'short' }));
    expect(res.status).toBe(400);
  });

  it('reset-password 400s on an unknown token', async () => {
    const { POST } = await resetRoute();
    const res = await POST(postJson('/api/auth/reset-password', { token: 'a'.repeat(64), password: 'longenough1' }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('TOKEN_INVALID');
  });
});
