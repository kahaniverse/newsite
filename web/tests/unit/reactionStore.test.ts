/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useReactionStore } from '@/store';

describe('reaction store (applyToggle)', () => {
  beforeEach(() => {
    // resetReactions also clears the module-level touched/pendingViews guards.
    useReactionStore.getState().resetReactions();
  });

  it('initCounts seeds counts and active flags', () => {
    useReactionStore.getState().initCounts('t1', { love: 5, follow: 2, view: 0 }, { love: true });
    expect(useReactionStore.getState().counts.t1).toEqual({ love: 5, follow: 2, view: 0 });
    expect(useReactionStore.getState().isActive('t1', 'love')).toBe(true);
    expect(useReactionStore.getState().isActive('t1', 'follow')).toBe(false);
  });

  it('activating love increments the count by exactly 1', () => {
    useReactionStore.getState().initCounts('t1', { love: 5, follow: 2, view: 0 });
    useReactionStore.getState().applyToggle('t1', 'love', true);
    expect(useReactionStore.getState().counts.t1.love).toBe(6);
    expect(useReactionStore.getState().isActive('t1', 'love')).toBe(true);
  });

  it('deactivating love decrements the count by exactly 1', () => {
    useReactionStore.getState().initCounts('t1', { love: 5, follow: 2, view: 0 }, { love: true });
    useReactionStore.getState().applyToggle('t1', 'love', false);
    expect(useReactionStore.getState().counts.t1.love).toBe(4);
    expect(useReactionStore.getState().isActive('t1', 'love')).toBe(false);
  });

  it('applyToggle is idempotent: same state in → no count change', () => {
    useReactionStore.getState().initCounts('t1', { love: 5, follow: 2, view: 0 }, { love: true });
    useReactionStore.getState().applyToggle('t1', 'love', true);
    expect(useReactionStore.getState().counts.t1.love).toBe(5);
  });

  it('does not go below zero', () => {
    useReactionStore.getState().initCounts('t1', { love: 0, follow: 0, view: 0 }, { love: true });
    useReactionStore.getState().applyToggle('t1', 'love', false);
    expect(useReactionStore.getState().counts.t1.love).toBe(0);
  });

  it('reconciling after a server disagreement settles correctly', () => {
    // Simulate the hook flow: optimistic add, then server says removed.
    useReactionStore.getState().initCounts('t1', { love: 5, follow: 0, view: 0 });
    useReactionStore.getState().applyToggle('t1', 'love', true);   // optimistic +1 → 6
    expect(useReactionStore.getState().counts.t1.love).toBe(6);
    useReactionStore.getState().applyToggle('t1', 'love', false);  // server: removed → -1 net from initial
    expect(useReactionStore.getState().counts.t1.love).toBe(5);    // back to 5, not 4 (no double-decrement)
  });

  // ── seed-if-absent: the store is the single source of truth (reqs 3 & 4) ──
  it('a later stale initCounts does NOT overwrite what the store already knows', () => {
    const s = useReactionStore.getState();
    s.initCounts('t1', { love: 10, follow: 0, view: 0 });
    s.applyToggle('t1', 'love', true); // I like it → 11, active
    expect(useReactionStore.getState().counts.t1.love).toBe(11);

    // Another screen re-mounts the strip with a STALE prop (e.g. cached at 10).
    s.initCounts('t1', { love: 10, follow: 0, view: 0 });
    expect(useReactionStore.getState().counts.t1.love).toBe(11);          // not clobbered
    expect(useReactionStore.getState().isActive('t1', 'love')).toBe(true); // still red
  });

  // ── hydration is authoritative for love/follow, preserves view ──
  it('hydrateState sets authoritative love/follow + my-state and keeps the seeded view', () => {
    useReactionStore.getState().initCounts('t1', { love: 0, follow: 0, view: 3 });
    useReactionStore.getState().hydrateState([
      { targetId: 't1', love: 2, follow: 1, view: 99, myLove: true, myFollow: false },
    ]);
    expect(useReactionStore.getState().counts.t1).toEqual({ love: 2, follow: 1, view: 3 }); // view kept = 3
    expect(useReactionStore.getState().isActive('t1', 'love')).toBe(true);
    expect(useReactionStore.getState().isActive('t1', 'follow')).toBe(false);
  });

  it('hydrateState does not clobber an in-flight optimistic toggle (touched guard)', () => {
    const s = useReactionStore.getState();
    s.initCounts('t1', { love: 5, follow: 0, view: 0 });
    s.applyToggle('t1', 'love', true); // optimistic → 6, marks t1 touched
    // Hydration response computed BEFORE the POST committed (server still says 5/not-mine).
    s.hydrateState([{ targetId: 't1', love: 5, follow: 0, view: 0, myLove: false, myFollow: false }]);
    expect(useReactionStore.getState().counts.t1.love).toBe(6);          // optimistic value survives
    expect(useReactionStore.getState().isActive('t1', 'love')).toBe(true);
  });

  // ── optimistic unique-view bump (req 1), order-independent ──
  it('recordView bumps the view count when the target is already seeded', () => {
    useReactionStore.getState().initCounts('t1', { love: 0, follow: 0, view: 4 });
    useReactionStore.getState().recordView('t1');
    expect(useReactionStore.getState().counts.t1.view).toBe(5);
  });

  it('recordView before seeding is applied when initCounts later seeds the target', () => {
    useReactionStore.getState().recordView('t2');                       // arrives first
    useReactionStore.getState().initCounts('t2', { love: 0, follow: 0, view: 7 });
    expect(useReactionStore.getState().counts.t2.view).toBe(8);         // 7 + pending 1
  });

  it('resetReactions clears state and the touched guard', () => {
    const s = useReactionStore.getState();
    s.initCounts('t1', { love: 5, follow: 0, view: 0 });
    s.applyToggle('t1', 'love', true); // touches t1
    s.resetReactions();
    expect(useReactionStore.getState().counts).toEqual({});
    // touched was cleared, so hydration may now write t1 again.
    s.initCounts('t1', { love: 9, follow: 0, view: 0 });
    s.hydrateState([{ targetId: 't1', love: 9, follow: 0, view: 0, myLove: true, myFollow: false }]);
    expect(useReactionStore.getState().isActive('t1', 'love')).toBe(true);
    expect(useReactionStore.getState().counts.t1.love).toBe(9);
  });
});
