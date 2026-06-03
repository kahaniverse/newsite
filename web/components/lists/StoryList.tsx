'use client';
import { useEffect, useRef } from 'react';
import { StoryCard } from '@/components/cards/StoryCard';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useInfiniteStories } from '@/hooks/useInfiniteStories';
import { usePanelStore } from '@/store';
import type { Story } from '@/lib/types';

interface Props {
  universeId?: string;
  status?:     string;
  q?:          string;
  onSelect?:   (story: Story) => void;
  initialData?: Story[];
}

export function StoryList({ universeId, status = 'published', q, onSelect, initialData }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteStories({ universeId, status, q });

  const selectedStoryId = usePanelStore(s => s.selectedStoryId);

  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const stories = data?.pages.flatMap(p => p.data) ?? initialData ?? [];

  if (isLoading && !initialData?.length) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  if (!stories.length) {
    return (
      <p className="text-center text-text-muted py-8 text-sm">
        No stories yet. Be the first to write one.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {stories.map(story => (
        <StoryCard
          key={story.id}
          story={story}
          onClick={() => onSelect?.(story)}
          selected={selectedStoryId === story.id}
        />
      ))}
      <div ref={sentinel} className="h-4" aria-hidden />
      {isFetchingNextPage && <CardSkeleton />}
    </div>
  );
}
