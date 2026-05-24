import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db/client';
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

  await sql`
    INSERT INTO authors (auth_id, display_name, password_hash)
    VALUES (${authId}, ${displayName}, ${passwordHash})
  `;

  return NextResponse.json({ ok: true }, { status: 201 });
}
