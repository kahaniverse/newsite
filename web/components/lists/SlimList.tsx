'use client';
import { SlimCard } from '@/components/cards/SlimCard';
import type { Author } from '@/lib/types';

interface Props { authors: Author[] }

export function SlimList({ authors }: Props) {
  if (!authors.length) return (
    <p className="text-sm text-text-muted text-center py-6">No authors yet.</p>
  );
  return (
    <div className="space-y-2" role="list" aria-label="Authors">
      {authors.map(a => (
        <div key={a.id} role="listitem"><SlimCard author={a} /></div>
      ))}
    </div>
  );
}
