'use client';

interface Props {
  open:     boolean;
  busy?:    boolean;
  onAnswer: (original: boolean) => void;
  onClose:  () => void;
}

// Recreates the old app's AttestOriginalityDialog shown before publishing a
// Universe / Story / Page.
export function AttestDialog({ open, busy = false, onAnswer, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attest-title"
      onClick={onClose}
    >
      <div
        className="paper-card w-full max-w-sm p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="attest-title" className="font-serif text-lg font-bold text-paper-ink">
          Is This Original Content?
        </h2>
        <p className="text-sm text-paper-muted leading-relaxed">
          You will be solely responsible for any copyright infringement. Only publish
          work that is your own original content.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAnswer(false)}
            className="flex-1 inline-flex items-center justify-center h-11 px-4 rounded-full border border-paper-border text-paper-ink font-medium text-sm hover:border-accent-deep hover:text-accent-deep transition-colors disabled:opacity-60"
          >
            No
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAnswer(true)}
            data-testid="attest-confirm"
            className="flex-1 btn-pill btn-pill-primary !text-sm disabled:opacity-60"
          >
            {busy ? 'Publishing…' : 'Yes, my original content'}
          </button>
        </div>
      </div>
    </div>
  );
}
