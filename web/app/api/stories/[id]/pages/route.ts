import { NextRequest, NextResponse } from 'next/server';
import { getPagesByStory } from '@/lib/db/queries/pages';

// Always reflect current DB state: the page tree is mutated by page creation
// (and by data migrations), and the client drives freshness via React Query
// invalidation — a cached route handler would defeat that and serve a stale tree.
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const pages = await getPagesByStory(params.id);
  return NextResponse.json({ data: pages });
}
