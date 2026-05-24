import { NextRequest, NextResponse } from 'next/server';
import { getPagesByStory } from '@/lib/db/queries/pages';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const pages = await getPagesByStory(params.id);
  return NextResponse.json({ data: pages });
}
