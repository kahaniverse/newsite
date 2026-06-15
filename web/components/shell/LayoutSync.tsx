'use client';
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePanelStore } from '@/store';

// Routes that represent a drilled-in entity (not a browse root). Used to step the
// narrow shell out of a stale deep route when the wide layout is in browse mode.
const DEEP_ROUTE = /^\/(stories|pages|universes|authors)\/[^/]+/;

type PanelSnapshot = ReturnType<typeof usePanelStore.getState>;

// Map the horizontal layout's in-place panel position to the URL the narrow,
// route-driven shell would use for the same screen. Returns null when there's
// nothing to do (browse mode already on a browse root).
function storeToPath(s: PanelSnapshot, path: string): string | null {
  if (s.selectedPageId)                                                   return `/pages/${s.selectedPageId}`;
  if (s.focused && s.selectedStoryId)                                     return `/stories/${s.selectedStoryId}`;
  if (s.focused && s.focusKind === 'author'   && s.selectedAuthorId)      return `/authors/${s.selectedAuthorId}`;
  if (s.focused && s.focusKind === 'universe' && s.selectedUniverseSlug)  return `/universes/${s.selectedUniverseSlug}`;
  // Browse mode: stay put on a browse root; bail out of a stale deep route.
  return DEEP_ROUTE.test(path) ? '/' : null;
}

// Both shells (horizontal cascade + narrow stack) are always mounted and merely
// CSS-toggled at the md breakpoint, so resizing/rotating swaps which one is
// visible. The narrow shell follows the URL; the horizontal shell drills in via
// the panel store. If those two ever disagree at the moment the breakpoint flips,
// switching layouts has to navigate — which momentarily shows the URL's (stale)
// browse-root screen before the real one loads.
//
// To make the swap seamless we keep the URL continuously in sync with the wide
// layout's selection (store → URL), so the route is always the shared source of
// truth. Then flipping to the narrow layout needs no navigation: its route
// content already matches. The reverse (URL → store) is handled by each route's
// <HydrateSelection>. We only drive store → URL while WIDE is visible — in the
// narrow layout the click handlers already push routes, so the URL leads there.
export function LayoutSync() {
  const pathname = usePathname() ?? '/';
  const router   = useRouter();
  // Guards a replace() from re-firing for the same target before the navigation
  // lands (usePathname/window.location lag a tick behind router.replace).
  const requestedRef = useRef<string | null>(null);

  // Clear the guard once the navigation actually lands.
  useEffect(() => { requestedRef.current = null; }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    let wasWide = mq.matches;

    // Continuously mirror a wide-layout drill-in into the URL so the narrow,
    // route-driven shell already matches the moment the breakpoint flips. Only
    // acts on a focused (deep) target — it deliberately never navigates to '/'.
    // Auto-bouncing to '/' here would race each route's <HydrateSelection> on a
    // fresh deep-link load (focused is briefly false before the effect runs) and
    // wrongly kick the page back to home.
    const mirrorDeep = () => {
      if (!mq.matches) return;                       // wide only
      const current = window.location.pathname;
      const target  = storeToPath(usePanelStore.getState(), current);
      if (target && target !== '/' && target !== current && target !== requestedRef.current) {
        requestedRef.current = target;
        router.replace(target, { scroll: false });
      }
    };

    // Coalesce a burst of store writes into a single mirror pass against the
    // SETTLED state. <HydrateSelection> applies a selection in several sequential
    // writes (selectUniverse → selectStory → setFocus); mirroring each one would
    // act on an intermediate state (e.g. universe-focused, story not set yet)
    // whose path differs from the final one, ping-ponging the URL forever. Running
    // on the next microtask lets the whole sequence finish first.
    let scheduled = false;
    const scheduleMirror = () => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => { scheduled = false; mirrorDeep(); });
    };

    // On an actual collapse to narrow, step out of a stale deep route if the wide
    // layout had drilled back out to browse mode. Safe to bail to '/' here: this
    // only runs on a real breakpoint change, long after hydration, so it can't
    // race the initial load the way mirrorDeep could.
    const onChange = (e: MediaQueryListEvent) => {
      const isWide = e.matches;
      if (wasWide && !isWide) {
        const current = window.location.pathname;
        const target  = storeToPath(usePanelStore.getState(), current);
        if (target && target !== current) router.replace(target);
      }
      wasWide = isWide;
      scheduleMirror();
    };

    const unsub = usePanelStore.subscribe(scheduleMirror);
    mq.addEventListener('change', onChange);
    mirrorDeep();

    return () => { unsub(); mq.removeEventListener('change', onChange); };
  }, [router]);

  return null;
}
