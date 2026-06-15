'use client';
import { useQuery } from '@tanstack/react-query';
import type { Page } from '@/lib/types';

// The full flat page list for a story (ordered by creation). Shared cache so the
// nav rail, leaf panel, etc. all derive page numbers from one fetch. Invalidated
// on page creation (see ComposePanel) so the numbers stay current.
export function useStoryPages(storyId: string | null) {
  return useQuery<{ data: Page[] }>({
    queryKey: ['story-pages', storyId],
    queryFn:  () => fetch(`/api/stories/${storyId}/pages`).then(r => r.json()),
    enabled:  !!storyId,
    staleTime: 15_000,
  });
}
