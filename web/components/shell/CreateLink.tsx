'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { usePanelStore } from '@/store';

interface Props {
  className?:  string;
  ariaLabel?:  string;
  children:    ReactNode;
}

// Routes to the story form when a universe is currently selected in the panel
// store, otherwise to the universe form. Used in every shell's create entry.
export function CreateLink({ className, ariaLabel, children }: Props) {
  const { selectionKind, selectedUniverseId } = usePanelStore();
  const href =
    selectionKind === 'universe' && selectedUniverseId
      ? `/stories/new?universeId=${selectedUniverseId}`
      : '/universes/new';

  return (
    <Link href={href} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
