import { Ratelimit } from '@upstash/ratelimit';
import type { NextRequest } from 'next/server';
import { redis } from './client';

export const mutationRateLimit = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(20, '1 m'),
  analytics: false,
  prefix:    'rl:mutation',
});

// Prefer the authenticated user when available; otherwise the first XFF hop;
// falling back to a deterministic anon bucket per remote address.
export function rateLimitIdentity(req: NextRequest, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const ip = xff.split(',')[0].trim();
    if (ip) return `ip:${ip}`;
  }
  const real = req.headers.get('x-real-ip');
  if (real) return `ip:${real.trim()}`;
  return 'ip:anon';
}

export async function checkRateLimit(identifier: string): Promise<{ success: boolean }> {
  return mutationRateLimit.limit(identifier);
}
