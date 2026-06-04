'use client';
import { useRouter } from 'next/navigation';
import { PageCard } from '@/components/cards/PageCard';
import type { Page } from '@/lib/types';

interface Props {
  pages:     Page[];
  /** If omitted, clicking a page navigates to its detail route. */
  onSelect?: (page: Page) => void;
}

// Header is supplied by the caller (SectionHeader / CompositeScreen).
export function PageList({ pages, onSelect }: Props) {
  const router = useRouter();
  if (!pages.length) return null;
  return (
    <div className="space-y-3">
      {pages.map(p => (
        <PageCard
          key={p.id}
          page={p}
          truncate
          onClick={() => (onSelect ? onSelect(p) : router.push(`/pages/${p.id}`))}
        />
      ))}
    </div>
  );
}
