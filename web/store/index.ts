'use client';
import { create } from 'zustand';

// ── Reaction store ────────────────────────────────────────────
type ReactionKind = 'love' | 'follow';

interface ReactionCounts { love: number; follow: number; view: number }

interface ReactionState {
  counts: Record<string, ReactionCounts>;
  active: Record<string, Record<ReactionKind, boolean>>;
  initCounts: (
    targetId: string,
    counts: ReactionCounts,
    opts?: { authoritative?: boolean },
  ) => void;
  isActive: (targetId: string, type: ReactionKind) => boolean;
  applyToggle: (targetId: string, type: ReactionKind, nextActive: boolean) => void;
  // Restore the viewer's own love/follow flags from the server (the red/active
  // glyph). Counts are NOT touched here — they come from the denormalized columns
  // via initCounts. Skips targets the viewer has toggled this session so an
  // in-flight optimistic toggle isn't reverted by a stale server response.
  hydrateState: (
    entries: Array<{ targetId: string; myLove: boolean; myFollow: boolean }>,
  ) => void;
  // Optimistically reflect the viewer's own unique view of an item. Order-
  // independent: if the target isn't seeded yet, the bump is queued and applied
  // when initCounts seeds it.
  recordView: (targetId: string) => void;
  // Drop all reaction state + session guards (call when the signed-in user
  // changes, so a new viewer doesn't inherit the previous viewer's "mine" flags).
  resetReactions: () => void;
}

const ZERO_ACTIVE: Record<ReactionKind, boolean> = { love: false, follow: false };

// The in-session store is the single source of truth for reactions. These
// module-level guards live alongside it (not reactive UI data):
//   touched      — targets the viewer toggled; hydration must not clobber an
//                  optimistic toggle that's still in flight.
//   pendingViews — view bumps that arrived before the target was seeded; applied
//                  when initCounts first seeds the target.
// resetReactions() clears all of them on an auth-user change.
let touched      = new Set<string>();
let pendingViews = new Set<string>();

export const useReactionStore = create<ReactionState>((set, get) => ({
  counts: {},
  active: {},

  // Seed-if-absent by default: the first value the store learns for a target
  // wins, so a later possibly-stale prop on a remount / back-navigation can't
  // overwrite what the store already knows. EXCEPTION: a detail hero passes
  // `authoritative` — its count comes from the per-request (force-dynamic) SSR
  // read, which is the freshest source, so it overrides a stale value a
  // background list card may have seeded first. Never overrides a target the
  // viewer has optimistically toggled (their in-flight value is the truth until
  // the POST settles), and never lowers the view count below what's recorded.
  initCounts(targetId, counts, opts) {
    set(state => {
      const known = state.counts[targetId];
      const authoritative = !!opts?.authoritative && !touched.has(targetId);
      if (known && !authoritative) return state; // seed-if-absent
      let view = counts.view;
      if (pendingViews.has(targetId)) { view += 1; pendingViews.delete(targetId); }
      if (known) view = Math.max(view, known.view); // keep an optimistic/recorded view
      return {
        counts: { ...state.counts, [targetId]: { love: counts.love, follow: counts.follow, view } },
        active: { ...state.active, [targetId]: state.active[targetId] ?? { ...ZERO_ACTIVE } },
      };
    });
  },

  isActive(targetId, type) {
    return !!get().active[targetId]?.[type];
  },

  hydrateState(entries) {
    set(state => {
      const active = { ...state.active };
      for (const e of entries) {
        if (touched.has(e.targetId)) continue; // don't clobber an in-flight optimistic toggle
        active[e.targetId] = { ...ZERO_ACTIVE, love: e.myLove, follow: e.myFollow };
      }
      return { active };
    });
  },

  recordView(targetId) {
    set(state => {
      const prev = state.counts[targetId];
      if (!prev) { pendingViews.add(targetId); return state; } // seed not here yet
      return { counts: { ...state.counts, [targetId]: { ...prev, view: prev.view + 1 } } };
    });
  },

  resetReactions() {
    touched      = new Set<string>();
    pendingViews = new Set<string>();
    set({ counts: {}, active: {} });
  },

  applyToggle(targetId, type, nextActive) {
    touched.add(targetId); // viewer-driven: protect this target from hydration clobber
    set(state => {
      const prevCounts = state.counts[targetId] ?? { love: 0, follow: 0, view: 0 };
      const prevActive = state.active[targetId] ?? ZERO_ACTIVE;
      // No-op if already in desired state.
      if (prevActive[type] === nextActive) return state;
      const delta = nextActive ? 1 : -1;
      return {
        counts: {
          ...state.counts,
          [targetId]: { ...prevCounts, [type]: Math.max(0, prevCounts[type] + delta) },
        },
        active: {
          ...state.active,
          [targetId]: { ...prevActive, [type]: nextActive },
        },
      };
    });
  },
}));

// ── Toast store ────────────────────────────────────────────────
interface Toast {
  id:      string;
  message: string;
  type:    'info' | 'error';
}
interface ToastState {
  toasts: Toast[];
  push:   (message: string, type?: Toast['type']) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push(message, type = 'info') {
    const id = crypto.randomUUID();
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })), 3500);
  },
  remove(id) {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },
}));

// ── Panel navigation store (wide/medium layouts) ──────────────
// `selectionKind` drives what the detail panel renders; an author selection
// and a universe selection are mutually exclusive at the top level, while
// story/page nest under a universe selection.
type SelectionKind = 'universe' | 'author' | null;

// Which entity the horizontal layout has "drilled into": its hero takes over
// panel 1 and the detail panel drops its own hero (focused-takeover cascade).
// Null = browse mode (panel 1 shows the browse list). Horizontal view only —
// the narrow shell ignores this entirely.
export type FocusKind = 'universe' | 'author' | 'story' | null;

// What the narrow shell's stacked detail view is currently showing.
// Populated by detail screens so the bottom nav can offer the right
// action (Extend Story / Add Next / Alter This / Edit).
export interface DetailMeta {
  kind:      'story' | 'page';
  storyId?:  string;
  pageId?:   string;
  parentId?: string | null;
  authorId?: string;
}

// An in-progress create flow surfaced in the horizontal layout's third panel
// (instead of a modal dialog like the universe form). A story compose carries
// its parent universe; a page compose carries its story, the parent it branches
// from, and whether it continues (`next`) or forks (`alter`). Cleared whenever
// the user changes selection so the form never lingers over a stale context.
export interface ComposeState {
  kind:        'story' | 'page';
  universeId?: string;            // story compose
  storyId?:    string;            // page compose
  parentId?:   string;            // page compose
  intent?:     'next' | 'alter';  // page compose
}

interface PanelState {
  selectionKind:        SelectionKind;
  selectedUniverseSlug: string | null;
  selectedUniverseId:   string | null;
  selectedAuthorId:     string | null;
  selectedStoryId:      string | null;
  selectedPageId:       string | null;
  detailMeta:           DetailMeta | null;
  // What the horizontal layout's third (leaf) panel shows in its default state
  // (nothing drilled in): the "Authors to follow" suggestions or the viewer's
  // notifications. Toggled from the bell at the top-right of that panel.
  leafMode:             'authors' | 'notifications';
  // Horizontal focused-takeover state (see FocusKind). `focused` toggles panel 1
  // between the browse list and the selected entity's hero. `focusKind` says
  // which entity that hero is. Selection actions are deliberately focus-agnostic;
  // takeover is driven separately via setFocus/clearFocus so passive seeding
  // (the home carousel) never hijacks panel 1.
  focused:              boolean;
  focusKind:            FocusKind;
  // The horizontal layout's third-panel create flow (see ComposeState). Null
  // when the leaf panel is showing its normal content.
  compose:              ComposeState | null;
  selectUniverse:  (slug: string, id?: string | null) => void;
  selectAuthor:    (id: string)   => void;
  selectStory:     (id: string)   => void;
  selectPage:      (id: string)   => void;
  clearStory:      () => void;
  clearPage:       () => void;
  setDetailMeta:   (meta: DetailMeta | null) => void;
  setFocus:        (kind: NonNullable<FocusKind>) => void;
  clearFocus:      () => void;
  startCompose:    (compose: ComposeState) => void;
  cancelCompose:   () => void;
  toggleLeafMode:  () => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  selectionKind:        null,
  selectedUniverseSlug: null,
  selectedUniverseId:   null,
  selectedAuthorId:     null,
  selectedStoryId:      null,
  selectedPageId:       null,
  detailMeta:           null,
  leafMode:             'authors',
  focused:              false,
  focusKind:            null,
  compose:              null,
  // Selection changes close any open compose form — its captured context (the
  // universe to write into, the page to branch from) no longer matches what the
  // panels now show.
  selectUniverse: (slug, id = null) => set({
    selectionKind:        'universe',
    selectedUniverseSlug: slug,
    selectedUniverseId:   id,
    selectedAuthorId:     null,
    selectedStoryId:      null,
    selectedPageId:       null,
    compose:              null,
  }),
  selectAuthor:   (id)   => set({
    selectionKind:        'author',
    selectedAuthorId:     id,
    selectedUniverseSlug: null,
    selectedUniverseId:   null,
    selectedStoryId:      null,
    selectedPageId:       null,
    compose:              null,
  }),
  selectStory:    (id)   => set({ selectedStoryId: id, selectedPageId: null, compose: null }),
  selectPage:     (id)   => set({ selectedPageId: id, compose: null }),
  clearStory:     ()     => set({ selectedStoryId: null, selectedPageId: null }),
  clearPage:      ()     => set({ selectedPageId: null }),
  setDetailMeta:  (meta) => set({ detailMeta: meta }),
  setFocus:       (kind) => set({ focused: true, focusKind: kind }),
  // "Browse" back / leaving for a browse-root route: drop the takeover AND the
  // story/page drill, so the narrow (route-driven) shell isn't mirrored back to
  // a stale story/page on rotation, and panel 3 doesn't keep a stale leaf.
  clearFocus:     ()     => set({ focused: false, focusKind: null, selectedStoryId: null, selectedPageId: null, compose: null }),
  startCompose:   (compose) => set({ compose }),
  cancelCompose:  ()     => set({ compose: null }),
  toggleLeafMode: ()     => set(s => ({ leafMode: s.leafMode === 'authors' ? 'notifications' : 'authors' })),
}));
