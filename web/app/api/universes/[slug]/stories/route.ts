import { NextRequest, NextResponse } from 'next/server';
import { getUniverseBySlug } from '@/lib/db/queries/universes';
import { getStories } from '@/lib/db/queries/stories';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const universe = await getUniverseBySlug(params.slug);
  if (!universe) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const sp    = req.nextUrl.searchParams;
  const page  = Number(sp.get('page') ?? 1);
  const limit = Number(sp.get('limit') ?? 10);
  const result = await getStories({ universeId: universe.id, page, limit, status: 'published' });
  return NextResponse.json({ ...result, page, limit, hasMore: result.total > page * limit });
}
