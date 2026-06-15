import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { redis } from '@/lib/redis/client';
import { CacheKeys } from '@/lib/redis/cache';
import { checkRateLimit, rateLimitIdentity } from '@/lib/redis/ratelimit';
import { sql } from '@/lib/db/client';

// GET /api/auth/verify?token=...  — the link emailed at signup.
// Soft verification: flips authors.email_verified to true, then redirects the
// browser back into the app with a status flag the UI can surface.
export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const redirect = (status: string) => NextResponse.redirect(new URL(`/?verified=${status}`, base));

  const { success } = await checkRateLimit(rateLimitIdentity(req));
  if (!success) return redirect('error');

  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (token.length < 32) return redirect('invalid');

  const hash = createHash('sha256').update(token).digest('hex');
  const key  = CacheKeys.emailVerify(hash);

  const payload = await redis.get<{ authorId: string; email: string } | string>(key);
  if (!payload) return redirect('invalid');
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

  await sql`UPDATE authors SET email_verified = true WHERE id = ${data.authorId}`;
  await redis.del(key);

  return redirect('1');
}
