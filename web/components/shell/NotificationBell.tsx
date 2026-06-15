'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

interface Props { variant?: 'rail' | 'header' }

// Bell with a live unread badge, linking to the notifications screen. Only mount
// for signed-in users (the nav already gates on session). Polls lightly on focus.
export function NotificationBell({ variant = 'rail' }: Props) {
  const pathname = usePathname() ?? '';
  const active   = pathname.startsWith('/notifications');

  const { data } = useQuery<{ unread: number }>({
    queryKey: ['notifications', 'unread'],
    queryFn:  () => fetch('/api/notifications').then(r => (r.ok ? r.json() : { unread: 0 })),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const unread = data?.unread ?? 0;
  const badge = unread > 0 && (
    <span
      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand text-white text-[10px] font-bold leading-4 text-center"
      aria-hidden
    >
      {unread > 9 ? '9+' : unread}
    </span>
  );
  const label = `Notifications${unread ? ` (${unread} unread)` : ''}`;

  if (variant === 'header') {
    return (
      <Link href="/notifications" aria-label={label} className="relative text-lg text-text-muted hover:text-accent transition-colors">
        <span aria-hidden>🔔</span>
        {badge}
      </Link>
    );
  }

  return (
    <Link
      href="/notifications"
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      title="Notifications"
      className={`relative w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors ${
        active ? 'bg-bg-elevated text-accent' : 'text-text-muted hover:text-accent hover:bg-bg-elevated/60'
      }`}
    >
      <span aria-hidden>🔔</span>
      {badge}
    </Link>
  );
}
