/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useReactionStore } from '@/store';

describe('reaction store (applyToggle)', () => {
  beforeEach(() => {
    useReactionStore.setState({ counts: {}, active: {} });
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
});
