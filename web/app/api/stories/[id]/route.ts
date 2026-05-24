import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { checkRateLimit, rateLimitIdentity } from '@/lib/redis/ratelimit';
import { getStoryById, updateStory, isStoryContributor } from '@/lib/db/queries/stories';

const UpdateSchema = z.object({
  title:      z.string().min(1).max(128).optional(),
  synopsis:   z.string().min(1).max(500).optional(),
  coverImage: z.string().url().optional(),
  genreTags:  z.array(z.string()).optional(),
  status:     z.enum(['draft','published','completed','abandoned']).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const story = await getStoryById(params.id);
  if (!story) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json(story);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { success } = await checkRateLimit(rateLimitIdentity(req, session!.user.id));
  if (!success) return NextResponse.json({ error: 'Rate limited', code: 'RATE_LIMITED' }, { status: 429 });

  const allowed = await isStoryContributor(params.id, session!.user.id);
  if (!allowed) return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });

  const body   = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message, code: 'VALIDATION' }, { status: 400 });

  const updated = await updateStory(params.id, parsed.data);
  return NextResponse.json(updated);
}
