'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { BeginningsPayload } from '@/lib/db/queries/pages';

// Infinite scroll over a story's beginnings (root + its child branches),
// fetched a page at a time from /api/stories/[id]/beginnings.
export function useInfiniteBeginnings(storyId: string | null) {
  return useInfiniteQuery<BeginningsPayload>({
    queryKey: ['beginnings', storyId],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(`/api/stories/${storyId}/beginnings?page=${pageParam}&limit=8`);
      if (!res.ok) throw new Error('Failed to load beginnings');
      return res.json();
    },
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    initialPageParam: 1,
    enabled: !!storyId,
    staleTime: 2 * 60 * 1000,
  });
}
