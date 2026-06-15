import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { sql } from '@/lib/db/client';
import { redis } from '@/lib/redis/client';
import { CacheKeys, TTL } from '@/lib/redis/cache';
import { sendEmail } from '@/lib/email/client';
import { checkRateLimit, rateLimitIdentity } from '@/lib/redis/ratelimit';
import { verifyTurnstile } from '@/lib/auth/turnstile';

const schema = z.object({
  displayName:  z.string().min(2).max(64),
  email:        z.string().email(),
  password:     z.string().min(8),
  captchaToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { success } = await checkRateLimit(rateLimitIdentity(req));
  if (!success) return NextResponse.json({ error: 'Rate limited', code: 'RATE_LIMITED' }, { status: 429 });

  const body   = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message, code: 'VALIDATION' }, { status: 400 });

  const captchaOk = await verifyTurnstile(parsed.data.captchaToken);
  if (!captchaOk) return NextResponse.json({ error: 'Captcha failed', code: 'CAPTCHA' }, { status: 400 });

  const { displayName, email, password } = parsed.data;
  const authId       = `email:${email.toLowerCase()}`;
  const passwordHash = await bcrypt.hash(password, 12);

  // Check uniqueness
  const existing = await sql`SELECT id FROM authors WHERE auth_id = ${authId} LIMIT 1`;
  if (existing.length) {
    return NextResponse.json({ error: 'Email already registered', code: 'DUPLICATE' }, { status: 409 });
  }

  // Check pen name uniqueness
  const nameTaken = await sql`SELECT id FROM authors WHERE display_name ILIKE ${displayName} LIMIT 1`;
  if (nameTaken.length) {
    return NextResponse.json({ error: 'Pen name already taken', code: 'DUPLICATE_NAME' }, { status: 409 });
  }

  const inserted = await sql`
    INSERT INTO authors (auth_id, display_name, password_hash)
    VALUES (${authId}, ${displayName}, ${passwordHash})
    RETURNING id
  `;
  const authorId = inserted[0].id as string;

  // Soft email verification: send a confirmation link but let the user in
  // immediately (the account is created with email_verified = false). Failure
  // to send must NOT fail registration — the user can re-request later — so the
  // whole step is best-effort.
  await sendVerificationEmail(authorId, email, displayName).catch(err =>
    console.error('[register] verification email failed (non-fatal):', err),
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}

async function sendVerificationEmail(authorId: string, email: string, displayName: string) {
  const token = randomBytes(32).toString('hex');
  const hash  = createHash('sha256').update(token).digest('hex');
  await redis.setex(
    CacheKeys.emailVerify(hash),
    TTL.emailVerify,
    JSON.stringify({ authorId, email: email.toLowerCase() }),
  );

  const base      = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const verifyUrl = `${base}/api/auth/verify?token=${token}`;

  await sendEmail({
    from:    'Kahaniverse <noreply@kahaniverse.com>',
    to:      email,
    subject: 'Confirm your Kahaniverse email',
    html: `
      <p>Welcome, ${displayName}!</p>
      <p>Confirm your email to complete your Kahaniverse profile. This link expires in 24 hours.</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>If you didn't create this account, you can ignore this email.</p>
    `,
  });
}
