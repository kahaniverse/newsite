import type { ReactNode } from 'react';

interface Props {
  title:    string;
  /** Optional trailing action (e.g. a "+ Write story" link). */
  action?:  ReactNode;
}

// Recreates the old app's section header: a red→transparent gradient bar
// with a bold white title (CompositeScroller.getTitleGradientText).
export function SectionHeader({ title, action }: Props) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3
        className="font-bold text-white text-lg px-3 py-1 rounded-sm"
        style={{ background: 'linear-gradient(to right, var(--brand), transparent)' }}
      >
        {title}
      </h3>
      {action}
    </div>
  );
}
