import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { checkRateLimit, rateLimitIdentity } from '@/lib/redis/ratelimit';
import { createPage } from '@/lib/db/queries/pages';
import { notifyNewPage } from '@/lib/db/queries/notifications';

const CreateSchema = z.object({
  storyId:      z.string().uuid(),
  parentId:     z.string().uuid(),
  content:      z.string().min(1).max(10000),
  illustration: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { success } = await checkRateLimit(rateLimitIdentity(req, session!.user.id));
  if (!success) return NextResponse.json({ error: 'Rate limited', code: 'RATE_LIMITED' }, { status: 429 });

  const body   = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message, code: 'VALIDATION' }, { status: 400 });

  try {
    const page = await createPage({ ...parsed.data, authorId: session!.user.id });
    // Notify followers of the story this page belongs to (best-effort).
    try { await notifyNewPage(session!.user.id, page.id, parsed.data.storyId, page.content.slice(0, 80)); } catch {}
    return NextResponse.json(page, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create', code: 'DB_ERROR' }, { status: 500 });
  }
}
