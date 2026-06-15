'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageCard } from '@/components/cards/PageCard';
import { PageList } from '@/components/lists/PageList';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Skeleton } from '@/components/ui/Skeleton';
import { SlimList } from '@/components/lists/SlimList';
import { NotificationList } from '@/components/lists/NotificationList';
import { usePanelStore } from '@/store';
import type { Page, Author } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';

export function LeafPanel() {
  const { selectedStoryId, selectedPageId, selectPage, setDetailMeta } = usePanelStore();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading]   = useState(false);

  // Fetch root pages of story when story selected but no page yet
  const [rootPage, setRootPage] = useState<Page | null>(null);

  // Hydrate detailMeta so the narrow shell's bottom nav can offer
  // Extend Story / Add Next / Alter This / Edit appropriately.
  useEffect(() => {
    if (page) {
      setDetailMeta({
        kind:     'page',
        pageId:   page.id,
        storyId:  page.storyId,
        parentId: page.parentId,
        authorId: page.author.id,
      });
    } else if (selectedStoryId) {
      setDetailMeta({ kind: 'story', storyId: selectedStoryId });
    } else {
      setDetailMeta(null);
    }
    return () => setDetailMeta(null);
  }, [page?.id, selectedStoryId, setDetailMeta]); // eslint-disable-line

  useEffect(() => {
    if (!selectedStoryId) return;
    // Get story pages, use first as root
    fetch(`/api/stories/${selectedStoryId}/pages`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data?.length) {
          const root = d.data.find((p: Page) => p.parentId === selectedStoryId) ?? d.data[0];
          setRootPage(root);
          if (!selectedPageId) setPage(root);
        }
      })
      .catch(() => null);
  }, [selectedStoryId]); // eslint-disable-line

  useEffect(() => {
    if (!selectedPageId) return;
    setLoading(true);
    fetch(`/api/pages/${selectedPageId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPage(d); })
      .finally(() => setLoading(false));
  }, [selectedPageId]);

  // Show suggested authors / notifications when nothing is drilled in
  if (!selectedStoryId) return <DefaultLeaf />;

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="w-full h-64" />
        <Skeleton className="w-3/4 h-4" />
        <Skeleton className="w-full h-32" />
      </div>
    );
  }

  if (!page) return null;

  const siblings = page.children ?? [];

  return (
    <div className="flex flex-col gap-5 pb-24 px-1 panel-enter">
      {/* Current page */}
      <ErrorBoundary>
        <PageCard page={page} />
      </ErrorBoundary>

      {/* Add page CTA */}
      {!page.disallowNext && (
        <Link
          href={`/pages/new?storyId=${page.storyId}&parentId=${page.id}`}
          className="flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-card text-sm text-text-muted hover:border-accent hover:text-accent transition-colors"
          aria-label="Continue this story"
        >
          <span aria-hidden>+</span> Continue this story
        </Link>
      )}

      {/* Sibling / alternate pages */}
      {!page.disallowAlternate && siblings.length > 0 && (
        <section>
          <SectionHeader title="Alternate Next Pages" />
          <ErrorBoundary>
            <PageList pages={siblings} onSelect={p => selectPage(p.id)} />
          </ErrorBoundary>
        </section>
      )}
    </div>
  );
}

// The third panel's default content: "Authors to follow" or the viewer's
// notifications, switched by the bell at the top-right. The bell toggles to a
// people glyph while notifications are showing, mirroring the active view.
function DefaultLeaf() {
  const { leafMode, toggleLeafMode } = usePanelStore();
  const showNotifications = leafMode === 'notifications';

  const { data: authorsData } = useQuery<{ data: Author[] }>({
    queryKey: ['authors', 'suggested'],
    queryFn:  () => fetch('/api/authors?limit=10').then(r => r.json()),
    staleTime: 10 * 60 * 1000,
    enabled:  !showNotifications,
  });

  // Unread count for the bell badge while the authors view is showing.
  const { data: notif } = useQuery<{ unread: number }>({
    queryKey: ['notifications', 'unread'],
    queryFn:  () => fetch('/api/notifications').then(r => (r.ok ? r.json() : { unread: 0 })),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const unread = notif?.unread ?? 0;

  const toggle = (
    <button
      type="button"
      onClick={toggleLeafMode}
      aria-label={showNotifications ? 'Show authors to follow' : 'Show notifications'}
      title={showNotifications ? 'Authors' : 'Notifications'}
      className="relative w-9 h-9 rounded-lg flex items-center justify-center text-lg text-text-muted hover:text-accent hover:bg-bg-elevated/60 transition-colors"
    >
      <span aria-hidden>{showNotifications ? '👥' : '🔔'}</span>
      {!showNotifications && unread > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand text-white text-[10px] font-bold leading-4 text-center"
          aria-hidden
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );

  return (
    <div className="flex flex-col gap-4 p-2">
      <SectionHeader title={showNotifications ? 'Notifications' : 'Authors to follow'} action={toggle} />
      <ErrorBoundary>
        {showNotifications
          ? <NotificationList />
          : <SlimList authors={authorsData?.data ?? []} />}
      </ErrorBoundary>
    </div>
  );
}
