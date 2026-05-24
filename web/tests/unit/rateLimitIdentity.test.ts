import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { rateLimitIdentity } from '@/lib/redis/ratelimit';

function makeReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/x', { headers });
}

describe('rateLimitIdentity', () => {
  it('prefers a passed-in user id', () => {
    const req = makeReq({ 'x-forwarded-for': '1.1.1.1' });
    expect(rateLimitIdentity(req, 'user-123')).toBe('u:user-123');
  });

  it('uses the first hop of x-forwarded-for', () => {
    const req = makeReq({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1, 172.16.0.1' });
    expect(rateLimitIdentity(req)).toBe('ip:203.0.113.5');
  });

  it('trims whitespace in the first XFF entry', () => {
    const req = makeReq({ 'x-forwarded-for': '   203.0.113.5  , 10.0.0.1' });
    expect(rateLimitIdentity(req)).toBe('ip:203.0.113.5');
  });

  it('falls back to x-real-ip when XFF is absent', () => {
    const req = makeReq({ 'x-real-ip': '198.51.100.7' });
    expect(rateLimitIdentity(req)).toBe('ip:198.51.100.7');
  });

  it('uses ip:anon as a last resort instead of collapsing to "anon"', () => {
    expect(rateLimitIdentity(makeReq())).toBe('ip:anon');
  });
});
