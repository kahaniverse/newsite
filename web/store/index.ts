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
}

const ZERO_ACTIVE: Record<ReactionKind, boolean> = { love: false, follow: false };

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

  applyToggle(targetId, type, nextActive) {
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
interface PanelState {
  selectedUniverseSlug: string | null;
  selectedStoryId:      string | null;
  selectedPageId:       string | null;
  selectUniverse:  (slug: string) => void;
  selectStory:     (id: string)   => void;
  selectPage:      (id: string)   => void;
  clearStory:      () => void;
  clearPage:       () => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  selectedUniverseSlug: null,
  selectedStoryId:      null,
  selectedPageId:       null,
  selectUniverse: (slug) => set({ selectedUniverseSlug: slug, selectedStoryId: null, selectedPageId: null }),
  selectStory:    (id)   => set({ selectedStoryId: id, selectedPageId: null }),
  selectPage:     (id)   => set({ selectedPageId: id }),
  clearStory:     ()     => set({ selectedStoryId: null, selectedPageId: null }),
  clearPage:      ()     => set({ selectedPageId: null }),
}));
