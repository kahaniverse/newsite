import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import slugify from 'slugify';
import { requireAuth } from '@/lib/auth/helpers';
import { checkRateLimit, rateLimitIdentity } from '@/lib/redis/ratelimit';
import { getCache, setCache, invalidateCache, TTL, CacheKeys } from '@/lib/redis/cache';
import { getUniverses, createUniverse, getUniverseCount } from '@/lib/db/queries/universes';

const GENRES = [
  'fantasy','scienceFiction','romance','thriller',
  'horror','mystery','adventure','historical','literary','other',
] as const;
const GenreEnum = z.enum(GENRES);

const CreateSchema = z.object({
  name:       z.string().min(1).max(64),
  concept:    z.string().min(1).max(2000),
  coverImage: z.string().url(),
  era:        z.string().max(64).optional(),
  world:      z.string().max(64).optional(),
  genres:     z.array(GenreEnum).default([]),
});

export async function GET(req: NextRequest) {
  const sp       = req.nextUrl.searchParams;
  const page     = Number(sp.get('page') ?? 1);
  const limit    = Number(sp.get('limit') ?? 10);
  const rawGenre = sp.get('genre');
  const genreParse = rawGenre ? GenreEnum.safeParse(rawGenre) : null;
  if (rawGenre && !genreParse?.success) {
    return NextResponse.json({ error: 'Unknown genre', code: 'VALIDATION' }, { status: 400 });
  }
  const genre    = genreParse?.success ? genreParse.data : undefined;
  const q        = sp.get('q') ?? undefined;
  const featured = sp.has('featured');
  const count    = sp.has('count');

  if (count) {
    const total = await getUniverseCount();
    return NextResponse.json({ total });
  }

  const cacheKey = featured ? CacheKeys.featuredUniverses() : undefined;
  if (cacheKey) {
    const cached = await getCache(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

  const result = await getUniverses({ page, limit, genre, q, featured });
  const payload = { ...result, page, limit, hasMore: result.total > page * limit };

  if (cacheKey) await setCache(cacheKey, payload, TTL.featuredUniverses);

  return NextResponse.json(payload);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { success } = await checkRateLimit(rateLimitIdentity(req, session!.user.id));
  if (!success) return NextResponse.json({ error: 'Rate limited', code: 'RATE_LIMITED' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message, code: 'VALIDATION' }, { status: 400 });

  const slug = slugify(parsed.data.name, { lower: true, strict: true });

  try {
    const universe = await createUniverse({
      ...parsed.data,
      slug,
      creatorId: session!.user.id,
    });
    await invalidateCache([CacheKeys.featuredUniverses()]);
    revalidateTag('universes');
    return NextResponse.json(universe, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    if (msg.includes('unique')) return NextResponse.json({ error: 'Name already taken', code: 'DUPLICATE' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to create', code: 'DB_ERROR' }, { status: 500 });
  }
}
