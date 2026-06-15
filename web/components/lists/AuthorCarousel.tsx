'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { SquareCard } from '@/components/cards/SquareCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePanelStore } from '@/store';
import type { Author, PaginatedResponse } from '@/lib/types';

interface Props { initialAuthors?: Author[] }

export function AuthorCarousel({ initialAuthors }: Props) {
  const { selectionKind, selectedAuthorId, selectAuthor } = usePanelStore();
  const router = useRouter();

  // Mirror the story feed: update the store for the wide/medium detail panel,
  // but on narrow viewports there is no detail panel, so stack the author
  // profile by routing to its dedicated page.
  function handleSelect(id: string) {
    selectAuthor(id);
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches) {
      router.push(`/authors/${id}`);
    }
  }

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
          <Skeleton key={i} className="w-[82px] h-[88px] rounded-br-[6px] shrink-0 snap-start" />
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
          <SquareCard
            author={a}
            onClick={() => handleSelect(a.id)}
            selected={selectionKind === 'author' && selectedAuthorId === a.id}
          />
        </div>
      ))}
    </div>
  );
}
