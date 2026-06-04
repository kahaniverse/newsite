'use client';
import Link from 'next/link';

interface Props {
  open:        boolean;
  onClose:     () => void;
  universeId:  string | null;
  storyId:     string | null;
}

// Bottom sheet opened by the central "Post" nav button — the old app's
// create-action menu. Offers context-aware create options.
export function CreateSheet({ open, onClose, universeId, storyId }: Props) {
  if (!open) return null;

  const items = [
    { label: 'New Universe', desc: 'Start a brand-new world',          href: '/universes/new', icon: '🌌' },
    ...(universeId ? [{ label: 'New Story', desc: 'Write in the selected universe', href: `/stories/new?universeId=${universeId}`, icon: '📖' }] : []),
    ...(storyId    ? [{ label: 'New Page',  desc: 'Continue the selected story',    href: `/pages/new?storyId=${storyId}&parentId=${storyId}&intent=next`, icon: '📝' }] : []),
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true" aria-label="Create" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55" />
      <div
        className="relative w-full bg-bg-card rounded-t-2xl border-t border-border p-4 pb-8 space-y-1 sheet-enter"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-border mb-3" aria-hidden />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted px-1 mb-1">Create</h3>

        {items.map(it => (
          <Link
            key={it.href}
            href={it.href}
            onClick={onClose}
            className="flex items-center gap-3 p-3 rounded-card hover:bg-bg-elevated transition-colors"
          >
            <span className="text-2xl" aria-hidden>{it.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{it.label}</p>
              <p className="text-xs text-text-muted">{it.desc}</p>
            </div>
          </Link>
        ))}

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-3 py-2.5 rounded-full border border-border text-text-muted text-sm hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
