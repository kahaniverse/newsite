'use client';
import { useEffect, useRef } from 'react';

interface Args {
  hasNextPage:        boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage:      () => void;
  /** How far ahead of the viewport to start fetching the next page. A positive
   *  margin prefetches before the sentinel is actually visible. */
  rootMargin?: string;
}

/**
 * Observe a sentinel element and pull the next page as it nears the viewport.
 * Returns the ref to attach to a sentinel rendered at the end of the list.
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '600px',
}: Args) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin]);

  return sentinel;
}
