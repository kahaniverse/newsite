'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface FabAction {
  label: string;
  href:  string;
  icon?: 'next' | 'alternate' | 'edit' | 'plus' | 'follow';
}

interface SingleProps {
  href:    string;
  label:   string;
  icon?:   FabAction['icon'];
  /** Optional data-testid for demo/automation (see web/demo/). */
  testId?: string;
}

// ── Single FAB (red circle, bottom-right, above the bottom nav) ──────────
// Mirrors the old app's SingleFloatingButton (react-native-paper FAB).
export function Fab({ href, label, icon = 'plus', testId }: SingleProps) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      aria-label={label}
      data-testid={testId}
      className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-brand text-white shadow-[0_4px_14px_rgba(0,0,0,0.5)] flex items-center justify-center hover:brightness-110 active:scale-95 transition"
    >
      <FabIcon name={icon} />
    </button>
  );
}

// ── Speed-dial FAB (expands to labelled actions) ─────────────────────────
// Mirrors the old app's MultipleFloatingButton (FAB.Group): tap to open,
// the main icon morphs to a close (×), actions fan out above with labels.
export function SpeedDialFab({ actions }: { actions: FabAction[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3">
      {/* Fan-out actions */}
      {open && actions.map(a => (
        <div key={a.href} className="flex items-center gap-2 panel-enter">
          <span className="text-xs font-medium text-paper-ink bg-paper px-2.5 py-1 rounded-md shadow-md">
            {a.label}
          </span>
          <button
            type="button"
            onClick={() => go(a.href)}
            aria-label={a.label}
            className="w-12 h-12 rounded-full bg-bg-elevated text-white border border-border shadow-lg flex items-center justify-center hover:border-accent active:scale-95 transition"
          >
            <FabIcon name={a.icon ?? 'plus'} />
          </button>
        </div>
      ))}

      {/* Main toggle */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close actions' : 'Add to this story'}
        aria-expanded={open}
        className="w-14 h-14 rounded-full bg-brand text-white shadow-[0_4px_14px_rgba(0,0,0,0.5)] flex items-center justify-center hover:brightness-110 active:scale-95 transition"
      >
        {open ? <CloseGlyph /> : <FabIcon name="plus" />}
      </button>
    </div>
  );
}

// ── Icons (clean, action-matching glyphs) ────────────────────────────────
export function FabIcon({ name }: { name: NonNullable<FabAction['icon']> }) {
  const c = 'currentColor';
  switch (name) {
    case 'next':      // next page — double chevron forward (page-next)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 6l6 6-6 6M13 6l6 6-6 6" />
        </svg>
      );
    case 'alternate': // alternate branch — git-branch (file-restore equivalent)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="6" cy="6" r="2.2" /><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="9" r="2.2" />
          <path d="M6 8.2v7.6M6 12h6a4 4 0 0 0 4-4v-.8" />
        </svg>
      );
    case 'edit':      // pencil (old account-edit single FAB)
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M13.5 6.5l3 3" />
        </svg>
      );
    case 'follow':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case 'plus':
    default:
      return <span className="text-3xl leading-none font-light" aria-hidden>+</span>;
  }
}

function CloseGlyph() {
  return <span className="text-2xl leading-none font-light" aria-hidden>×</span>;
}
