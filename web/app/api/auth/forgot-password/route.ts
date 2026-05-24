import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash, randomBytes } from 'crypto';
import { sendEmail } from '@/lib/email/client';
import { redis } from '@/lib/redis/client';
import { CacheKeys, TTL } from '@/lib/redis/cache';
import { checkRateLimit, rateLimitIdentity } from '@/lib/redis/ratelimit';
import { sql } from '@/lib/db/client';

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const { success } = await checkRateLimit(rateLimitIdentity(req));
  if (!success) return NextResponse.json({ error: 'Rate limited', code: 'RATE_LIMITED' }, { status: 429 });

  const body   = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email', code: 'VALIDATION' }, { status: 400 });

  const email  = parsed.data.email.toLowerCase();
  const authId = `email:${email}`;

  const rows = await sql`SELECT id, display_name FROM authors WHERE auth_id = ${authId} LIMIT 1`;
  // Always return 200 to prevent email enumeration
  if (!rows.length) return NextResponse.json({ ok: true });

  const author  = rows[0];
  const token   = randomBytes(32).toString('hex');
  const hash    = createHash('sha256').update(token).digest('hex');
  const key     = CacheKeys.passwordReset(hash);

  await redis.setex(key, TTL.passwordReset, JSON.stringify({ authorId: author.id, email }));

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  await sendEmail({
    from:    'Kahaniverse <noreply@kahaniverse.com>',
    to:      email,
    subject: 'Reset your Kahaniverse password',
    html: `
      <p>Hi ${author.display_name as string},</p>
      <p>Click the link below to reset your password. It expires in 15 minutes.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
