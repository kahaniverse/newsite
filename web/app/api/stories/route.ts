import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { checkRateLimit, rateLimitIdentity } from '@/lib/redis/ratelimit';
import { getStories, createStory } from '@/lib/db/queries/stories';
import { notifyNewStory } from '@/lib/db/queries/notifications';
import { personaFromRequest, personaIncludesMature } from '@/lib/persona';

const GENRES = [
  'fantasy','scienceFiction','romance','thriller',
  'horror','mystery','adventure','historical','literary','other',
] as const;
const STATUSES = ['draft','published','completed','abandoned'] as const;

const CreateSchema = z.object({
  title:       z.string().min(1).max(128),
  synopsis:    z.string().min(1).max(500),
  universeId:  z.string().uuid(),
  genreTags:   z.array(z.enum(GENRES)).default([]),
  coverImage:  z.string().url().optional(),
  isMature:    z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const sp         = req.nextUrl.searchParams;
  const page       = Number(sp.get('page') ?? 1);
  const limit      = Number(sp.get('limit') ?? 10);
  const universeId = sp.get('universeId') ?? undefined;
  const rawStatus  = sp.get('status');
  const statusParse = rawStatus ? z.enum(STATUSES).safeParse(rawStatus) : null;
  if (rawStatus && !statusParse?.success) {
    return NextResponse.json({ error: 'Unknown status', code: 'VALIDATION' }, { status: 400 });
  }
  const status     = statusParse?.success ? statusParse.data : 'published';
  const q          = sp.get('q') ?? undefined;
  const persona    = personaFromRequest(req);

  const result = await getStories({
    universeId, page, limit, status, q, includeMature: personaIncludesMature(persona),
  });
  return NextResponse.json({ ...result, page, limit, hasMore: result.total > page * limit });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { success } = await checkRateLimit(rateLimitIdentity(req, session!.user.id));
  if (!success) return NextResponse.json({ error: 'Rate limited', code: 'RATE_LIMITED' }, { status: 429 });

  const body   = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message, code: 'VALIDATION' }, { status: 400 });

  try {
    const story = await createStory({ ...parsed.data, creatorId: session!.user.id });
    revalidateTag('stories');
    // Notify followers of the universe and of the author (best-effort).
    try { await notifyNewStory(session!.user.id, story.id, parsed.data.universeId, story.title); } catch {}
    return NextResponse.json(story, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create', code: 'DB_ERROR' }, { status: 500 });
  }
}
