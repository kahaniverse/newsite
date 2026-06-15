'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AvatarImage } from '@/components/ui/AvatarImage';

interface Item {
  id:          string;
  type:        'new_universe' | 'new_story' | 'new_page';
  title:       string;
  url:         string;
  read:        boolean;
  createdAt:   string;
  actorName:   string | null;
  actorAvatar: string | null;
}

const VERB: Record<Item['type'], string> = {
  new_universe: 'created a new universe',
  new_story:    'published a new story',
  new_page:     'added a new page',
};

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationList() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ items: Item[]; unread: number }>({
    queryKey: ['notifications', 'list'],
    queryFn:  () => fetch('/api/notifications').then(r => (r.ok ? r.json() : { items: [], unread: 0 })),
    staleTime: 0,
  });

  // Opening the screen clears the unread badge.
  useEffect(() => {
    if (!data || data.unread === 0) return;
    fetch('/api/notifications', { method: 'PATCH' })
      .then(() => qc.invalidateQueries({ queryKey: ['notifications', 'unread'] }))
      .catch(() => null);
  }, [data, qc]);

  if (isLoading) return <p className="text-sm text-text-muted text-center py-8">Loading…</p>;
  const items = data?.items ?? [];
  if (!items.length) {
    return <p className="text-sm text-text-muted text-center py-10">No notifications yet. Follow authors, universes and stories to hear about new chapters.</p>;
  }

  return (
    <ul className="space-y-2" aria-label="Notifications">
      {items.map(n => (
        <li key={n.id}>
          <Link
            href={n.url}
            className={`flex items-start gap-3 p-3 paper-card hover:shadow-[0_2px_10px_rgba(0,0,0,0.45)] transition-shadow ${n.read ? '' : 'ring-1 ring-accent/40'}`}
          >
            <AvatarImage src={n.actorAvatar ?? undefined} alt={n.actorName ?? 'Author'} size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-paper-ink leading-snug">
                <span className="font-semibold">{n.actorName ?? 'Someone'}</span> {VERB[n.type]}:{' '}
                <span className="font-medium">{n.title}</span>
              </p>
              <p className="text-xs text-paper-muted mt-0.5">{timeAgo(n.createdAt)}</p>
            </div>
            {!n.read && <span className="mt-1 w-2 h-2 rounded-full bg-brand shrink-0" aria-label="Unread" />}
          </Link>
        </li>
      ))}
    </ul>
  );
}
