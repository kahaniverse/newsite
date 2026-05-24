'use client';
import { useQuery } from '@tanstack/react-query';
import { SquareCard } from '@/components/cards/SquareCard';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Author, PaginatedResponse } from '@/lib/types';

interface Props { initialAuthors?: Author[] }

export function AuthorCarousel({ initialAuthors }: Props) {
  const { data, isLoading } = useQuery<PaginatedResponse<Author>>({
    queryKey: ['authors', 'top'],
    queryFn:  () => fetch('/api/authors?limit=20').then(r => r.json()),
    enabled:  !initialAuthors?.length,
    staleTime: 5 * 60 * 1000,
  });

  const authors = initialAuthors ?? data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x-mandatory">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="w-20 h-28 shrink-0 snap-start" />
        ))}
      </div>
    );
  }

  if (!authors.length) return null;

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-2 snap-x-mandatory"
      role="list"
      aria-label="Featured authors"
    >
      {authors.map(a => (
        <div key={a.id} role="listitem" className="snap-start shrink-0">
          <SquareCard author={a} />
        </div>
      ))}
    </div>
  );
}
