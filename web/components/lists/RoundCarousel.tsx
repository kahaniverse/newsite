'use client';
import { RoundCard } from '@/components/cards/RoundCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { Character } from '@/lib/types';

interface Props { characters: Character[]; }

export function RoundCarousel({ characters }: Props) {
  if (!characters.length) return null;
  return (
    <section aria-label="Characters">
      <SectionHeader title="Characters" />
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
