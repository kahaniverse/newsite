'use client';
import { usePanelStore } from '@/store';
import { ScrollColumn } from '@/components/shell/ScrollColumn';
import { LeafPanel } from '@/components/panels/LeafPanel';
import { ComposePanel } from '@/components/panels/ComposePanel';

// Panel 3 of the horizontal layout. Normally the leaf (page detail / suggested
// authors), but when a story or page create flow is active it hands its slot to
// the inline ComposePanel form. The column is desktop-only at rest (`hidden
// lg:block`) but reveals itself on tablet too while composing, so the create
// form the user just opened is always visible.
export function LeafColumn() {
  const compose = usePanelStore(s => s.compose);

  return (
    <ScrollColumn
      label={compose ? 'Create' : 'Page detail'}
      className={compose ? '' : 'hidden lg:block'}
    >
      {compose ? <ComposePanel compose={compose} /> : <LeafPanel />}
    </ScrollColumn>
  );
}
