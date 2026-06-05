'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  label:      string;
  children:   ReactNode;
  /** Extra classes for the outer column (borders, etc.). */
  className?: string;
}

// A horizontal-layout panel column: scrolls without a visible scrollbar and
// surfaces thin "nub" buttons over its top/bottom edge that fade in on hover
// and only when there is actually more content to reveal in that direction.
export function ScrollColumn({ label, children, className = '' }: Props) {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const holdRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hover, setHover]   = useState(false);
  const [canUp, setCanUp]   = useState(false);
  const [canDown, setCanDown] = useState(false);

  const refresh = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanUp(el.scrollTop > 4);
    setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  // Re-evaluate when content size changes (async data, expanding lists).
  useEffect(() => {
    refresh();
    const ro = new ResizeObserver(refresh);
    if (contentRef.current) ro.observe(contentRef.current);
    if (scrollRef.current)  ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, [refresh]);

  const step = useCallback((dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ top: dir * el.clientHeight * 0.8, behavior: 'smooth' });
  }, []);

  // Press-and-hold scrolls continuously; a plain click pages by ~80% height.
  const startHold = useCallback((dir: 1 | -1) => {
    step(dir);
    holdRef.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollBy({ top: dir * 32 });
    }, 16);
  }, [step]);

  const stopHold = useCallback(() => {
    if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null; }
  }, []);

  useEffect(() => stopHold, [stopHold]);

  return (
    <section
      aria-label={label}
      className={`relative flex-1 min-w-0 ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); stopHold(); }}
    >
      <div ref={scrollRef} onScroll={refresh} className="h-full overflow-y-auto no-scrollbar">
        <div ref={contentRef} className="p-4 min-h-full">{children}</div>
      </div>

      <Nub side="top"    visible={hover && canUp}   onStep={() => startHold(-1)} onStop={stopHold} />
      <Nub side="bottom" visible={hover && canDown} onStep={() => startHold(1)}  onStop={stopHold} />
    </section>
  );
}

function Nub({ side, visible, onStep, onStop }: {
  side: 'top' | 'bottom';
  visible: boolean;
  onStep: () => void;
  onStop: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={side === 'top' ? 'Scroll up' : 'Scroll down'}
      tabIndex={visible ? 0 : -1}
      onMouseDown={onStep}
      onMouseUp={onStop}
      onMouseLeave={onStop}
      className={`scroll-nub scroll-nub-${side} ${visible ? 'is-visible' : ''}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {side === 'top' ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
      </svg>
    </button>
  );
}
