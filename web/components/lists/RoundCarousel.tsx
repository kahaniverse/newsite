'use client';
import { RoundCard } from '@/components/cards/RoundCard';
import type { Character } from '@/lib/types';

interface Props { characters: Character[]; }

export function RoundCarousel({ characters }: Props) {
  if (!characters.length) return null;
  return (
    <section aria-label="Characters">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
        Characters
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2 snap-x-mandatory" role="list">
        {characters.map(c => (
          <div key={c.id} role="listitem" className="snap-start shrink-0">
            <RoundCard character={c} />
          </div>
        ))}
      </div>
    </section>
  );
}
