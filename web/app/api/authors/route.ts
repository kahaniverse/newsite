import { NextRequest, NextResponse } from 'next/server';
import { getAuthors } from '@/lib/db/queries/authors';

export async function GET(req: NextRequest) {
  const sp    = req.nextUrl.searchParams;
  const page  = Number(sp.get('page') ?? 1);
  const limit = Number(sp.get('limit') ?? 20);
  const result = await getAuthors({ page, limit });
  return NextResponse.json({ ...result, page, limit, hasMore: result.total > page * limit });
}
