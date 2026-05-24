'use client';
import { PageCard } from '@/components/cards/PageCard';
import type { Page } from '@/lib/types';

interface Props {
  pages:    Page[];
  onSelect: (page: Page) => void;
  label?:   string;
}

export function PageList({ pages, onSelect, label = 'Alternate Pages' }: Props) {
  if (!pages.length) return null;
  return (
    <section aria-label={label}>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
        {label}
      </h3>
      <div className="space-y-3">
        {pages.map(p => (
          <PageCard key={p.id} page={p} truncate onClick={() => onSelect(p)} />
        ))}
      </div>
    </section>
  );
}
