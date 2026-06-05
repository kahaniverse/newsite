import { NextRequest, NextResponse } from 'next/server';
import { getStoryBeginnings } from '@/lib/db/queries/pages';

// Paginated beginnings (root + a slice of its child branches) for the story
// detail panel's infinite scroll. GET is public, like the rest of the read API.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sp    = req.nextUrl.searchParams;
  const page  = Math.max(1, Number(sp.get('page') ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get('limit') ?? 8) || 8));
  const result = await getStoryBeginnings(params.id, { page, limit });
  return NextResponse.json(result);
}
