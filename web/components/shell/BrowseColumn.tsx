'use client';
import { usePanelStore } from '@/store';
import { BrowsePanel } from '@/components/panels/BrowsePanel';
import { SelectionHero } from '@/components/panels/SelectionHero';
import type { Universe } from '@/lib/types';

interface Props {
  initialUniverses?: Universe[];
  autoSeed?:         boolean;
}

// Panel 1 of the horizontal layout. Browse list by default; once an entity is
// focused (drilled into), it hands its slot over to that entity's hero.
export function BrowseColumn({ initialUniverses, autoSeed }: Props) {
  const focused = usePanelStore(s => s.focused);

  if (focused) return <SelectionHero />;
  return <BrowsePanel initialUniverses={initialUniverses} autoSeed={autoSeed} horizontal />;
}
