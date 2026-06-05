'use client';
import { useQuery } from '@tanstack/react-query';
import type { Universe, Author, Story } from '@/lib/types';

// Shared fetchers for the currently-focused entity. The horizontal layout shows
// the same entity in two places at once — its hero in panel 1 and its body in
// panel 2 — so both read through React Query to share a single request/cache.

export function useUniverse(slug: string | null) {
  return useQuery<Universe | null>({
    queryKey: ['universe', slug],
    queryFn:  () => fetch(`/api/universes/${slug}`).then(r => (r.ok ? r.json() : null)),
    enabled:  !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAuthor(id: string | null) {
  return useQuery<Author | null>({
    queryKey: ['author', id],
    queryFn:  () => fetch(`/api/authors/${id}`).then(r => (r.ok ? r.json() : null)),
    enabled:  !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStory(id: string | null) {
  return useQuery<Story | null>({
    queryKey: ['story', id],
    queryFn:  () => fetch(`/api/stories/${id}`).then(r => (r.ok ? r.json() : null)),
    enabled:  !!id,
    staleTime: 5 * 60 * 1000,
  });
}
