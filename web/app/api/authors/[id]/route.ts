import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { checkRateLimit, rateLimitIdentity } from '@/lib/redis/ratelimit';
import { getCache, setCache, invalidateCache, TTL, CacheKeys } from '@/lib/redis/cache';
import { getAuthorById, updateAuthor } from '@/lib/db/queries/authors';

const UpdateSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  bio:         z.string().max(500).optional(),
  avatarImage: z.string().url().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const cacheKey = CacheKeys.authorProfile(params.id);
  const cached   = await getCache(cacheKey);
  if (cached) return NextResponse.json(cached);

  const author = await getAuthorById(params.id);
  if (!author) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  await setCache(cacheKey, author, TTL.authorProfile);
  return NextResponse.json(author);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (session!.user.id !== params.id) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const { success } = await checkRateLimit(rateLimitIdentity(req, session!.user.id));
  if (!success) return NextResponse.json({ error: 'Rate limited', code: 'RATE_LIMITED' }, { status: 429 });

  const body   = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message, code: 'VALIDATION' }, { status: 400 });

  const updated = await updateAuthor(params.id, parsed.data);
  await invalidateCache([CacheKeys.authorProfile(params.id)]);
  return NextResponse.json(updated);
}
