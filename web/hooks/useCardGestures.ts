'use client';
import { useRef } from 'react';

interface Opts {
  onTap?:        () => void;
  onDoubleTap?:  () => void;
  onSwipeRight?: () => void;
  onSwipeLeft?:  () => void;
}

const TAP_SLOP   = 10;   // px of movement still counts as a tap
const SWIPE_MIN  = 55;   // px horizontal travel to register a swipe
const DOUBLE_MS  = 280;  // max gap between taps for a double-tap

// Pointer-based card gestures: tap (delayed so a double-tap can pre-empt it),
// double-tap, and horizontal swipe. Taps/swipes that start on a nested control
// (link, button) are ignored so reaction buttons and inner links keep working.
// Only used on cards in VERTICAL lists, where a horizontal swipe doesn't fight
// a horizontal scroll container.
export function useCardGestures({ onTap, onDoubleTap, onSwipeLeft, onSwipeRight }: Opts) {
  const start       = useRef<{ x: number; y: number; interactive: boolean } | null>(null);
  const lastTapAt   = useRef(0);
  const singleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    const interactive = !!(e.target as HTMLElement).closest('a,button,input,textarea,select,[role="button"]');
    start.current = { x: e.clientX, y: e.clientY, interactive };
  }

  function onPointerUp(e: React.PointerEvent) {
    const s = start.current;
    start.current = null;
    if (!s || s.interactive) return; // a nested control handles its own tap

    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;

    // Horizontal swipe takes precedence over tap.
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
      (dx > 0 ? onSwipeRight : onSwipeLeft)?.();
      return;
    }

    // Otherwise it's a tap (small movement).
    if (Math.abs(dx) <= TAP_SLOP && Math.abs(dy) <= TAP_SLOP) {
      const now = Date.now();
      if (onDoubleTap && now - lastTapAt.current < DOUBLE_MS) {
        lastTapAt.current = 0;
        if (singleTimer.current) { clearTimeout(singleTimer.current); singleTimer.current = null; }
        onDoubleTap();
      } else if (onDoubleTap) {
        // Delay the single tap so a following tap can turn it into a double-tap.
        lastTapAt.current = now;
        singleTimer.current = setTimeout(() => { singleTimer.current = null; onTap?.(); }, DOUBLE_MS);
      } else {
        onTap?.(); // no double-tap handler → no need to delay
      }
    }
  }

  return { onPointerDown, onPointerUp };
}
