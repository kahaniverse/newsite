import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getAuthors } from '@/lib/db/queries/authors';

export async function GET(req: NextRequest) {
  const sp    = req.nextUrl.searchParams;
  const page  = Number(sp.get('page') ?? 1);
  const limit = Number(sp.get('limit') ?? 20);
  // Keep the signed-in user out of their own "authors to follow" lists.
  const session = await auth();
  const result = await getAuthors({ page, limit, exclude: session?.user?.id });
  return NextResponse.json({ ...result, page, limit, hasMore: result.total > page * limit });
}
