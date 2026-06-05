'use client';
import { useRouter } from 'next/navigation';
import { StoryCard } from '@/components/cards/StoryCard';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useInfiniteStories } from '@/hooks/useInfiniteStories';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { usePanelStore } from '@/store';
import type { Story } from '@/lib/types';

interface Props {
  universeId?: string;
  status?:     string;
  q?:          string;
  /** If omitted, clicking a story navigates to its detail route. */
  onSelect?:   (story: Story) => void;
  initialData?: Story[];
}

export function StoryList({ universeId, status = 'published', q, onSelect, initialData }: Props) {
  const router = useRouter();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteStories({ universeId, status, q });

  const selectedStoryId = usePanelStore(s => s.selectedStoryId);

  const sentinel = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

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
      {stories.map((story, i) => (
        <StoryCard
          key={story.id}
          story={story}
          index={i}
          onClick={() => (onSelect ? onSelect(story) : router.push(`/stories/${story.id}`))}
          selected={selectedStoryId === story.id}
        />
      ))}
      <div ref={sentinel} className="h-4" aria-hidden />
      {isFetchingNextPage && <CardSkeleton />}
    </div>
  );
}
