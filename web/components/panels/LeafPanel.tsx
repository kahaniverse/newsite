'use client';
import { useEffect, useState } from 'react';
import { PageCard } from '@/components/cards/PageCard';
import { PageList } from '@/components/lists/PageList';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Skeleton } from '@/components/ui/Skeleton';
import { SlimList } from '@/components/lists/SlimList';
import { NotificationList } from '@/components/lists/NotificationList';
import { PageNavBar } from '@/components/ui/PageNavBar';
import { usePanelStore } from '@/store';
import type { Page, Author } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { useStoryPages } from '@/hooks/useStoryPages';
import { buildPageNav } from '@/lib/page-nav';

export function LeafPanel() {
  const { selectedStoryId, selectedPageId, selectPage, setDetailMeta, startCompose } = usePanelStore();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading]   = useState(false);

  // Page numbering + prev/next — derived from the story's page tree.
  const { data: storyPages } = useStoryPages(selectedStoryId);
  const nav = buildPageNav(storyPages?.data ?? []);

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

  // Default the reader to the first beginning (page 1) when a story is opened
  // with no page yet. The concept (page 0 / root) is the panel-1 hero, never the
  // reader's content. A deep link that already set selectedPageId keeps its page.
  const firstBeginning = nav.rootId ? nav.firstChildOf(nav.rootId) : null;
  useEffect(() => {
    if (selectedStoryId && !selectedPageId && firstBeginning) selectPage(firstBeginning);
  }, [selectedStoryId, selectedPageId, firstBeginning, selectPage]);

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

  const num        = nav.numberOf(page.id); // 0 until the page tree loads
  const prevId     = nav.parentOf(page.id);
  const nextId     = nav.firstChildOf(page.id);
  const atTop      = !prevId || prevId === nav.rootId; // level 1 — concept is page 0
  const alternates = nav.siblingsOf(page.id).filter(p => p.id !== page.id);
  const continueLabel = num ? `Continue — add page ${num + 1}` : 'Continue this story';

  return (
    <div className="flex flex-col gap-5 pb-24 px-1 panel-enter">
      {/* Current page */}
      <ErrorBoundary>
        <PageCard page={page} />
      </ErrorBoundary>

      {/* Control bar: ‹ prev   [ + Continue — add page N+1 ]   next › */}
      <PageNavBar
        onPrev={!atTop && prevId ? () => selectPage(prevId) : undefined}
        onNext={nextId ? () => selectPage(nextId) : undefined}
        prevDisabled={atTop}
        nextDisabled={!nextId}
      >
        {!page.disallowNext ? (
          <button
            type="button"
            onClick={() => startCompose({ kind: 'page', storyId: page.storyId, parentId: page.id, intent: 'next' })}
            className="flex items-center justify-center gap-2 py-2.5 px-4 w-full border border-dashed border-border rounded-card text-sm text-text-muted hover:border-accent hover:text-accent transition-colors"
            aria-label={continueLabel}
          >
            <span aria-hidden>+</span> {continueLabel}
          </button>
        ) : (
          <span className="text-xs text-text-muted">The story ends here.</span>
        )}
      </PageNavBar>

      {/* Alternate pages at this level (siblings), plus a way to add one. */}
      {!page.disallowAlternate && (
        <section>
          <SectionHeader title={num <= 1 ? 'Alternate Beginnings' : `Alternate pages — page ${num}`} />
          {alternates.length > 0 && (
            <ErrorBoundary>
              <PageList pages={alternates} onSelect={p => selectPage(p.id)} />
            </ErrorBoundary>
          )}
          <button
            type="button"
            onClick={() => startCompose({ kind: 'page', storyId: page.storyId, parentId: page.parentId ?? page.storyId, intent: 'alter' })}
            className="mt-3 flex items-center justify-center gap-2 py-3 w-full border border-dashed border-border rounded-card text-sm text-text-muted hover:border-accent hover:text-accent transition-colors"
            aria-label={num > 1 ? `Add an alternate page ${num}` : 'Add an alternate beginning'}
          >
            <span aria-hidden>+</span> {num > 1 ? `Add alternate page ${num}` : 'Add an alternate beginning'}
          </button>
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
