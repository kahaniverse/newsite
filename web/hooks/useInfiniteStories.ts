'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Story, PaginatedResponse } from '@/lib/types';

interface Options {
  universeId?: string;
  status?:     string;
  q?:          string;
}

export function useInfiniteStories(opts: Options = {}) {
  return useInfiniteQuery<PaginatedResponse<Story>>({
    queryKey: ['stories', opts],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({ page: String(pageParam), limit: '10' });
      if (opts.universeId) params.set('universeId', opts.universeId);
      if (opts.status)     params.set('status',     opts.status);
      if (opts.q)          params.set('q',           opts.q);
      const res = await fetch(`/api/stories?${params}`);
      if (!res.ok) throw new Error('Failed to load stories');
      return res.json();
    },
    getNextPageParam: (last) => last.hasMore ? last.page + 1 : undefined,
    initialPageParam: 1,
  });
}
