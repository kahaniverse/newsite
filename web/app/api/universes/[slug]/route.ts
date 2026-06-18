import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { checkRateLimit, rateLimitIdentity } from '@/lib/redis/ratelimit';
import { invalidateCache, CacheKeys } from '@/lib/redis/cache';
import { getUniverseBySlug, updateUniverse, deleteUniverseBySlug } from '@/lib/db/queries/universes';

const UpdateSchema = z.object({
  name:       z.string().min(1).max(64).optional(),
  concept:    z.string().min(1).max(2000).optional(),
  coverImage: z.string().url().optional(),
  era:        z.string().max(64).optional(),
  world:      z.string().max(64).optional(),
  genres:     z.array(z.string()).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const universe = await getUniverseBySlug(params.slug);
  if (!universe) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json(universe);
}

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { success } = await checkRateLimit(rateLimitIdentity(req, session!.user.id));
  if (!success) return NextResponse.json({ error: 'Rate limited', code: 'RATE_LIMITED' }, { status: 429 });

  const universe = await getUniverseBySlug(params.slug);
  if (!universe) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
  if (universe.creator.id !== session!.user.id) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message, code: 'VALIDATION' }, { status: 400 });

  const updated = await updateUniverse(params.slug, parsed.data);
  await invalidateCache(CacheKeys.featuredUniversesAll());
  revalidateTag('universes');
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { slug: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const universe = await getUniverseBySlug(params.slug);
  if (!universe) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
  if (universe.creator.id !== session!.user.id) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const deleted = await deleteUniverseBySlug(params.slug);
  if (!deleted) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  await invalidateCache(CacheKeys.featuredUniversesAll());
  revalidateTag('universes');
  return new NextResponse(null, { status: 204 });
}
