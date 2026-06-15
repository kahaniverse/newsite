'use client';
import { StoryList } from '@/components/lists/StoryList';
import { PageList } from '@/components/lists/PageList';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { PageNavBar } from '@/components/ui/PageNavBar';
import { usePanelStore } from '@/store';
import { useUniverse, useAuthor } from '@/hooks/useSelection';
import { useStoryPages } from '@/hooks/useStoryPages';
import { buildPageNav } from '@/lib/page-nav';
import { useEffect } from 'react';

// Panel 2 — the body of the current selection, never its hero. The hero always
// lives in panel 1 (the browse carousel for the highlighted universe, or the
// focused-takeover hero once drilled in), so this panel shows only what's
// "inside" the selection: a universe's / author's stories, or a story's pages.
export function EntityDetailPanel() {
  const { selectionKind, selectedAuthorId, focusKind } = usePanelStore();

  if (focusKind === 'story') return <StoryBody />;
  if (selectionKind === 'author' && selectedAuthorId) return <AuthorBody authorId={selectedAuthorId} />;
  return <UniverseBody />;
}

// ── Universe — just its latest stories ──────────────────────────────
function UniverseBody() {
  const { selectedUniverseSlug, startCompose, focused } = usePanelStore();
  const { data: universe, isLoading } = useUniverse(selectedUniverseSlug);

  if (!selectedUniverseSlug && !universe) return <FeaturedCarouselPlaceholder />;
  if (isLoading && !universe) return <DetailSkeleton />;
  if (!universe) return null;

  return (
    <div className="flex flex-col gap-5 pb-24 px-1 panel-enter">
      <section aria-label={`Stories in ${universe.name}`}>
        <SectionHeader
          title="Latest Stories"
          // Only offer "Write story" once the universe is actually chosen
          // (focused) — matching the NavRail gate. The home carousel passively
          // seeds this panel with a universe the user hasn't deliberately picked.
          action={
            focused ? (
              <button
                type="button"
                onClick={() => startCompose({ kind: 'story', universeId: universe.id })}
                className="text-xs text-accent hover:underline font-medium"
                aria-label="Write a new story in this universe"
              >
                + Write story
              </button>
            ) : undefined
          }
        />
        <ErrorBoundary>
          {/* Default click navigates to /stories/[id]; that route hydrates the
              cascade (panel-1 hero → beginnings → leaf) and updates the URL. */}
          <StoryList universeId={universe.id} />
        </ErrorBoundary>
      </section>
    </div>
  );
}

// ── Author — just their authored stories ────────────────────────────
function AuthorBody({ authorId }: { authorId: string }) {
  const { data: author, isLoading } = useAuthor(authorId);

  if (isLoading && !author) return <DetailSkeleton />;
  if (!author) return <div className="p-6 text-center text-text-muted text-sm">Author not found.</div>;

  return (
    <div className="flex flex-col gap-5 pb-24 px-1 panel-enter">
      <section aria-label={`Stories by ${author.displayName}`}>
        <SectionHeader title="Stories Authored" />
        <ErrorBoundary>
          <StoryList />
        </ErrorBoundary>
      </section>
    </div>
  );
}

// ── Story — a page-level navigator (Beginnings / Page N) ────────────
// Panel 2 steps through page *numbers*: the root is the concept (page 0, shown
// as the panel-1 hero), its children are the "Beginnings" (page 1), and so on.
// At any level it lists the alternates there (siblings of the selected page) and
// the `< >` arrows move the shared selection up/down a level, in lock-step with
// the reader in panel 3.
function StoryBody() {
  const { selectedStoryId, selectedPageId, selectPage, startCompose } = usePanelStore();
  const { data, isLoading } = useStoryPages(selectedStoryId);
  const pages = data?.data ?? [];
  const nav = buildPageNav(pages);

  // Default the selection to the first beginning so the reader (panel 3) isn't
  // empty when a story is freshly opened.
  const firstBeginning = nav.rootId ? nav.firstChildOf(nav.rootId) : null;
  useEffect(() => {
    if (selectedStoryId && !selectedPageId && firstBeginning) selectPage(firstBeginning);
  }, [selectedStoryId, selectedPageId, firstBeginning, selectPage]);

  if (isLoading && !pages.length) {
    return (
      <div className="p-4 space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  // The level being browsed and its alternates. With nothing selected we sit at
  // page 1 (the beginnings = the root's children).
  const level   = selectedPageId ? nav.numberOf(selectedPageId) : 1;
  const levelPages = selectedPageId ? nav.siblingsOf(selectedPageId)
                   : firstBeginning ? nav.siblingsOf(firstBeginning)
                   : []; // no selection and no beginnings yet → empty state below

  const prevId = selectedPageId ? nav.parentOf(selectedPageId) : null;
  const nextId = selectedPageId ? nav.firstChildOf(selectedPageId) : null;

  return (
    <div className="flex flex-col gap-5 pb-24 px-1 panel-enter">
      <section aria-label="Story pages">
        <SectionHeader
          title={level <= 1 ? 'Beginnings' : `Page ${level}`}
          action={
            <PageNavBar
              onPrev={prevId && prevId !== nav.rootId ? () => selectPage(prevId) : undefined}
              onNext={nextId ? () => selectPage(nextId) : undefined}
              prevDisabled={!prevId || prevId === nav.rootId}
              nextDisabled={!nextId}
            />
          }
        />
        {levelPages.length > 0 ? (
          <PageList pages={levelPages} onSelect={p => selectPage(p.id)} />
        ) : (
          <div className="px-1 space-y-3">
            <p className="text-sm text-text-muted">
              No pages yet — add the first page to begin this story.
            </p>
            {selectedStoryId && (
              <button
                type="button"
                onClick={() => startCompose({ kind: 'page', storyId: selectedStoryId, parentId: selectedStoryId, intent: 'next' })}
                className="flex items-center justify-center gap-2 py-3 w-full border border-dashed border-border rounded-card text-sm text-text-muted hover:border-accent hover:text-accent transition-colors"
                aria-label="Add the first page"
              >
                <span aria-hidden>+</span> Add the first page
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="w-2/3 h-6" />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

function FeaturedCarouselPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6 text-text-muted">
      <span className="text-5xl" aria-hidden>📚</span>
      <p className="font-serif text-lg text-text-primary">Pick a universe</p>
      <p className="text-sm">Select a universe from the browse panel to explore its stories.</p>
    </div>
  );
}
