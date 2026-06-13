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
    active?: Partial<Record<ReactionKind, boolean>>,
  ) => void;
  isActive: (targetId: string, type: ReactionKind) => boolean;
  applyToggle: (targetId: string, type: ReactionKind, nextActive: boolean) => void;
  // Seed authoritative reaction state from the server (counts + whether the
  // viewer reacted), so the filled love/connect glyphs AND the counts are
  // consistent on every view of the same entity and never show a stale count.
  hydrateState: (
    entries: Array<{
      targetId: string;
      love: number; follow: number; view: number;
      myLove: boolean; myFollow: boolean;
    }>,
  ) => void;
}

const ZERO_ACTIVE: Record<ReactionKind, boolean> = { love: false, follow: false };

// Targets the viewer has toggled this session. Server hydration must never
// clobber an optimistic toggle that's still in flight, so hydrateState skips
// these. Kept outside store state — it's a guard, not reactive UI data.
const touched = new Set<string>();

export const useReactionStore = create<ReactionState>((set, get) => ({
  counts: {},
  active: {},

  initCounts(targetId, counts, active) {
    set(state => ({
      counts: { ...state.counts, [targetId]: counts },
      active: {
        ...state.active,
        [targetId]: { ...ZERO_ACTIVE, ...(state.active[targetId] ?? {}), ...(active ?? {}) },
      },
    }));
  },

  isActive(targetId, type) {
    return !!get().active[targetId]?.[type];
  },

  hydrateState(entries) {
    set(state => {
      const counts = { ...state.counts };
      const active = { ...state.active };
      for (const e of entries) {
        if (touched.has(e.targetId)) continue; // don't clobber an in-flight optimistic toggle
        counts[e.targetId] = { love: e.love, follow: e.follow, view: e.view };
        active[e.targetId] = { ...ZERO_ACTIVE, love: e.myLove, follow: e.myFollow };
      }
      return { counts, active };
    });
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

interface PanelState {
  selectionKind:        SelectionKind;
  selectedUniverseSlug: string | null;
  selectedUniverseId:   string | null;
  selectedAuthorId:     string | null;
  selectedStoryId:      string | null;
  selectedPageId:       string | null;
  detailMeta:           DetailMeta | null;
  // Horizontal focused-takeover state (see FocusKind). `focused` toggles panel 1
  // between the browse list and the selected entity's hero. `focusKind` says
  // which entity that hero is. Selection actions are deliberately focus-agnostic;
  // takeover is driven separately via setFocus/clearFocus so passive seeding
  // (the home carousel) never hijacks panel 1.
  focused:              boolean;
  focusKind:            FocusKind;
  selectUniverse:  (slug: string, id?: string | null) => void;
  selectAuthor:    (id: string)   => void;
  selectStory:     (id: string)   => void;
  selectPage:      (id: string)   => void;
  clearStory:      () => void;
  clearPage:       () => void;
  setDetailMeta:   (meta: DetailMeta | null) => void;
  setFocus:        (kind: NonNullable<FocusKind>) => void;
  clearFocus:      () => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  selectionKind:        null,
  selectedUniverseSlug: null,
  selectedUniverseId:   null,
  selectedAuthorId:     null,
  selectedStoryId:      null,
  selectedPageId:       null,
  detailMeta:           null,
  focused:              false,
  focusKind:            null,
  selectUniverse: (slug, id = null) => set({
    selectionKind:        'universe',
    selectedUniverseSlug: slug,
    selectedUniverseId:   id,
    selectedAuthorId:     null,
    selectedStoryId:      null,
    selectedPageId:       null,
  }),
  selectAuthor:   (id)   => set({
    selectionKind:        'author',
    selectedAuthorId:     id,
    selectedUniverseSlug: null,
    selectedUniverseId:   null,
    selectedStoryId:      null,
    selectedPageId:       null,
  }),
  selectStory:    (id)   => set({ selectedStoryId: id, selectedPageId: null }),
  selectPage:     (id)   => set({ selectedPageId: id }),
  clearStory:     ()     => set({ selectedStoryId: null, selectedPageId: null }),
  clearPage:      ()     => set({ selectedPageId: null }),
  setDetailMeta:  (meta) => set({ detailMeta: meta }),
  setFocus:       (kind) => set({ focused: true, focusKind: kind }),
  // "Browse" back / leaving for a browse-root route: drop the takeover AND the
  // story/page drill, so the narrow (route-driven) shell isn't mirrored back to
  // a stale story/page on rotation, and panel 3 doesn't keep a stale leaf.
  clearFocus:     ()     => set({ focused: false, focusKind: null, selectedStoryId: null, selectedPageId: null }),
}));
