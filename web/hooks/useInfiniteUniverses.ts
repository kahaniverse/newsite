'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Universe, PaginatedResponse } from '@/lib/types';

interface Options {
  genre?:    string;
  q?:        string;
  featured?: boolean;
  limit?:    number;
}

// Page-by-page universe feed for infinite scroll. Backed by the same
// `/api/universes` list endpoint the rest of the app uses.
export function useInfiniteUniverses(opts: Options = {}) {
  const { genre, q, featured, limit = 12 } = opts;
  return useInfiniteQuery<PaginatedResponse<Universe>>({
    queryKey: ['universes', 'infinite', { genre, q, featured, limit }],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({ page: String(pageParam), limit: String(limit) });
      if (genre)    params.set('genre', genre);
      if (q)        params.set('q', q);
      if (featured) params.set('featured', 'true');
      const res = await fetch(`/api/universes?${params}`);
      if (!res.ok) throw new Error('Failed to load universes');
      return res.json();
    },
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}
