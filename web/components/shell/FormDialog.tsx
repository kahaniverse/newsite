'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  title:    string;
  children: React.ReactNode;
}

// Horizontal-view wrapper for the create/edit forms: presents them as a modal
// dialog over a dimmed backdrop instead of the mobile NarrowShell (which carries
// a bottom nav bar). Dismissing — backdrop click, the ✕, or Escape — navigates
// back to the route the user came from. The forms themselves already call
// router.push on success and router.back on cancel, so the dialog needs no
// explicit submit wiring.
export function FormDialog({ title, children }: Props) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') router.back(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/80 p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => router.back()}
    >
      <div
        className="w-full max-w-xl my-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-serif text-lg font-bold text-text-primary">{title}</h1>
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Close"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:text-accent hover:bg-bg-elevated/60 transition-colors"
          >
            <span className="text-xl leading-none" aria-hidden>✕</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
