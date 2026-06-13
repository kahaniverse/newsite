import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { checkRateLimit, rateLimitIdentity } from '@/lib/redis/ratelimit';
import { acquireLock, CacheKeys, TTL } from '@/lib/redis/cache';
import { toggleReaction } from '@/lib/db/queries/reactions';

const ReactionSchema = z.object({
  type:       z.enum(['love', 'follow', 'view']),
  targetType: z.enum(['universe', 'story', 'page', 'author']),
  targetId:   z.string().uuid(),
});

async function handle(req: NextRequest, method: 'POST' | 'DELETE') {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { success } = await checkRateLimit(rateLimitIdentity(req, session!.user.id));
  if (!success) return NextResponse.json({ error: 'Rate limited', code: 'RATE_LIMITED' }, { status: 429 });

  const body   = await req.json().catch(() => ({}));
  const parsed = ReactionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message, code: 'VALIDATION' }, { status: 400 });

  const { type, targetType, targetId } = parsed.data;
  const userId = session!.user.id;

  // Dedup lock (fail-open: a Redis outage skips dedup rather than 500ing).
  const lockKey  = CacheKeys.reactionLock(userId, type, targetId);
  const proceed  = await acquireLock(lockKey, TTL.reactionLock);
  if (!proceed) return NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMITED' }, { status: 429 });

  try {
    const result = await toggleReaction(userId, type, targetType, targetId);
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: 'Failed', code: 'DB_ERROR' }, { status: 500 });
  }
}

export const POST   = (req: NextRequest) => handle(req, 'POST');
export const DELETE = (req: NextRequest) => handle(req, 'DELETE');
