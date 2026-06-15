'use client';
import type { ReactNode } from 'react';

interface Props {
  onPrev?:      () => void;
  onNext?:      () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  /** The bar's centre content (a header label, or the Continue button). */
  children?:    ReactNode;
  className?:   string;
}

const arrowCls =
  'w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-lg text-text-muted ' +
  'hover:text-accent hover:bg-bg-elevated/60 transition-colors ' +
  'disabled:opacity-30 disabled:hover:text-text-muted disabled:hover:bg-transparent disabled:cursor-default';

// Shared `< … >` page-stepper used by both the beginnings list (panel 2) and the
// page reader (panel 3) so prev/next look and behave identically. The arrows
// move the shared page selection; the centre slot holds the level label or the
// Continue CTA.
export function PageNavBar({ onPrev, onNext, prevDisabled, nextDisabled, children, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onPrev}
        disabled={prevDisabled || !onPrev}
        aria-label="Previous page"
        title="Previous page"
        className={arrowCls}
      >
        <span aria-hidden>‹</span>
      </button>
      <div className="flex-1 min-w-0 flex items-center justify-center">{children}</div>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || !onNext}
        aria-label="Next page"
        title="Next page"
        className={arrowCls}
      >
        <span aria-hidden>›</span>
      </button>
    </div>
  );
}
