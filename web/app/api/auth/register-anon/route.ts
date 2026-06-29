import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash, randomInt } from 'crypto';
import { createAnonAuthor } from '@/lib/db/queries/authors';
import { notifyAdminSignup } from '@/lib/email/client';
import { checkRateLimit, rateLimitIdentity } from '@/lib/redis/ratelimit';
import { verifyTurnstile } from '@/lib/auth/turnstile';
import { generatePenName } from '@/lib/penname';

const schema = z.object({
  displayName:  z.string().min(2).max(64).optional(),
  captchaToken: z.string().optional(),
});

// Recovery-code alphabet: uppercase + digits, minus visually ambiguous
// characters (0/O, 1/I) so a human can transcribe it reliably.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** e.g. "KV-7Q4M-9XTB-2KWP-RH6D" — ~80 bits of entropy, easy to copy. */
function generateRecoveryCode(): string {
  const groups = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(''),
  );
  return `KV-${groups.join('-')}`;
}

export async function POST(req: NextRequest) {
  const { success } = await checkRateLimit(rateLimitIdentity(req));
  if (!success) return NextResponse.json({ error: 'Rate limited', code: 'RATE_LIMITED' }, { status: 429 });

  const body   = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message, code: 'VALIDATION' }, { status: 400 });

  const captchaOk = await verifyTurnstile(parsed.data.captchaToken);
  if (!captchaOk) return NextResponse.json({ error: 'Captcha failed', code: 'CAPTCHA' }, { status: 400 });

  const displayName  = parsed.data.displayName?.trim() || generatePenName();
  const recoveryCode = generateRecoveryCode();
  const recoveryHash = createHash('sha256').update(recoveryCode).digest('hex');

  try {
    const author = await createAnonAuthor({ displayName, recoveryHash });

    await notifyAdminSignup({ identifier: author.displayName, provider: 'recovery' }).catch(err =>
      console.error('[register-anon] admin notify failed (non-fatal):', err),
    );

    // Return the plaintext code exactly ONCE. It is never stored or logged — the
    // user must save it now; it is the only way back into this account.
    return NextResponse.json(
      { ok: true, recoveryCode, displayName: author.displayName },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Could not create account. Try again.', code: 'DB_ERROR' }, { status: 500 });
  }
}
