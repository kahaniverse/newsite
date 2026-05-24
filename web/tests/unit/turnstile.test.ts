import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { verifyTurnstile } from '@/lib/auth/turnstile';

describe('verifyTurnstile', () => {
  const origFetch = global.fetch;
  const origEnv   = { ...process.env };

  beforeEach(() => {
    process.env = { ...origEnv };
  });
  afterEach(() => {
    global.fetch = origFetch;
  });

  it('returns true in non-production when secret is missing (dev bypass)', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    process.env.NODE_ENV = 'development';
    expect(await verifyTurnstile('whatever')).toBe(true);
  });

  it('returns false in production when secret is missing', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    process.env.NODE_ENV = 'production';
    expect(await verifyTurnstile('whatever')).toBe(false);
  });

  it('returns false when no token is supplied even with secret set', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    expect(await verifyTurnstile(undefined)).toBe(false);
    expect(await verifyTurnstile('')).toBe(false);
  });

  it('returns true when Cloudflare responds with success', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })) as typeof fetch;
    expect(await verifyTurnstile('tok')).toBe(true);
  });

  it('returns false when Cloudflare responds with success:false', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 200 })) as typeof fetch;
    expect(await verifyTurnstile('tok')).toBe(false);
  });

  it('returns false on network error', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    global.fetch = vi.fn(async () => { throw new Error('net down'); }) as typeof fetch;
    expect(await verifyTurnstile('tok')).toBe(false);
  });
});
