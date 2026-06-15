import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { NotificationList } from '@/components/lists/NotificationList';
import { auth } from '@/lib/auth/config';

export const metadata: Metadata = { title: 'Notifications — Kahaniverse' };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect('/login?callbackUrl=/notifications');

  return (
    <NarrowShell title="Notifications">
      <div className="max-w-xl mx-auto py-6">
        <SectionHeader title="Notifications" />
        <NotificationList />
      </div>
    </NarrowShell>
  );
}
