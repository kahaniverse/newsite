'use client';
import Link from 'next/link';
import { StoryList } from '@/components/lists/StoryList';
import { PageList } from '@/components/lists/PageList';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { usePanelStore } from '@/store';
import { useUniverse, useAuthor } from '@/hooks/useSelection';
import { useInfiniteBeginnings } from '@/hooks/useInfiniteBeginnings';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

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
  const { selectedUniverseSlug, selectStory, setFocus } = usePanelStore();
  const { data: universe, isLoading } = useUniverse(selectedUniverseSlug);

  // Picking a story straight from the browse carousel's story list should lock
  // panel 1 onto this universe's hero (the story already belongs to it) rather
  // than leave the carousel cycling. The chosen story then drives panel 3.
  function handleSelect(storyId: string) {
    selectStory(storyId);
    setFocus('universe');
  }

  if (!selectedUniverseSlug && !universe) return <FeaturedCarouselPlaceholder />;
  if (isLoading && !universe) return <DetailSkeleton />;
  if (!universe) return null;

  return (
    <div className="flex flex-col gap-5 pb-24 px-1 panel-enter">
      <section aria-label={`Stories in ${universe.name}`}>
        <SectionHeader
          title="Latest Stories"
          action={
            <Link
              href={`/stories/new?universeId=${universe.id}`}
              className="text-xs text-accent hover:underline font-medium"
              aria-label="Write a new story in this universe"
            >
              + Write story
            </Link>
          }
        />
        <ErrorBoundary>
          <StoryList universeId={universe.id} onSelect={s => handleSelect(s.id)} />
        </ErrorBoundary>
      </section>
    </div>
  );
}

// ── Author — just their authored stories ────────────────────────────
function AuthorBody({ authorId }: { authorId: string }) {
  const { selectStory } = usePanelStore();
  const { data: author, isLoading } = useAuthor(authorId);

  if (isLoading && !author) return <DetailSkeleton />;
  if (!author) return <div className="p-6 text-center text-text-muted text-sm">Author not found.</div>;

  return (
    <div className="flex flex-col gap-5 pb-24 px-1 panel-enter">
      <section aria-label={`Stories by ${author.displayName}`}>
        <SectionHeader title="Stories Authored" />
        <ErrorBoundary>
          <StoryList onSelect={s => selectStory(s.id)} />
        </ErrorBoundary>
      </section>
    </div>
  );
}

// ── Story — its beginnings to dive into ─────────────────────────────
function StoryBody() {
  const { selectedStoryId, selectPage } = usePanelStore();
  // Root + its alternate-beginning branches, paged in on scroll instead of
  // pulling the whole page tree up front.
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteBeginnings(selectedStoryId);
  const sentinel = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const root       = data?.pages[0]?.root ?? null;
  const children   = data?.pages.flatMap(p => p.data) ?? [];
  const beginnings = root ? [root, ...children] : [];

  return (
    <div className="flex flex-col gap-5 pb-24 px-1 panel-enter">
      <section aria-label="Story beginnings">
        <SectionHeader title="Beginnings" />
        {beginnings.length > 0
          ? <PageList pages={beginnings} onSelect={p => selectPage(p.id)} />
          : <p className="text-sm text-text-muted px-1">No pages yet — be the first to begin this story.</p>}
        <div ref={sentinel} className="h-4" aria-hidden />
        {isFetchingNextPage && <CardSkeleton />}
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
