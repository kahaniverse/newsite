import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { getNotifications, getUnreadCount, markAllRead } from '@/lib/db/queries/notifications';

export const dynamic = 'force-dynamic';

// The current viewer's notifications + unread count.
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [items, unread] = await Promise.all([
    getNotifications(session!.user.id, 30),
    getUnreadCount(session!.user.id),
  ]);
  return NextResponse.json({ items, unread });
}

// Mark all of the viewer's notifications read.
export async function PATCH() {
  const { session, error } = await requireAuth();
  if (error) return error;

  await markAllRead(session!.user.id);
  return NextResponse.json({ ok: true });
}
