import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { redis } from '@/lib/redis/client';
import { CacheKeys } from '@/lib/redis/cache';
import { checkRateLimit, rateLimitIdentity } from '@/lib/redis/ratelimit';
import { sql } from '@/lib/db/client';

const schema = z.object({
  token:    z.string().min(32),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const { success } = await checkRateLimit(rateLimitIdentity(req));
  if (!success) return NextResponse.json({ error: 'Rate limited', code: 'RATE_LIMITED' }, { status: 429 });

  const body   = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', code: 'VALIDATION' }, { status: 400 });

  const hash = createHash('sha256').update(parsed.data.token).digest('hex');
  const key  = CacheKeys.passwordReset(hash);

  const payload = await redis.get<{ authorId: string; email: string } | string>(key);
  if (!payload) {
    return NextResponse.json({ error: 'Token invalid or expired', code: 'TOKEN_INVALID' }, { status: 400 });
  }
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await sql`UPDATE authors SET password_hash = ${passwordHash} WHERE id = ${data.authorId}`;
  await redis.del(key);

  return NextResponse.json({ ok: true });
}
