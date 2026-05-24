import { auth } from './config';
import { NextResponse } from 'next/server';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function getOptionalAuth() {
  const session = await auth();
  return session ?? null;
}
