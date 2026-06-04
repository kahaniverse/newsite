import { describe, it, expect } from 'vitest';
import { dummyPage } from '@/lib/sample-content';

// The page screen falls back to dummyPage on an empty DB / non-UUID id, so the
// shape must stay aligned with the Page type the real renderer expects.
describe('dummyPage', () => {
  it('uses the requested id as the root id and a null parent', () => {
    const p = dummyPage('my-id');
    expect(p.id).toBe('my-id');
    expect(p.parentId).toBeNull();
  });

  it('renders two alternate children parented to the root', () => {
    const p = dummyPage('root');
    expect(p.children).toHaveLength(2);
    for (const child of p.children) {
      expect(child.parentId).toBe('root');
      expect(child.children).toEqual([]);
      expect(child.content.length).toBeGreaterThan(0);
    }
  });

  it('has a system author and non-negative counters', () => {
    const p = dummyPage('root');
    expect(p.author.id).toBe('system');
    expect(p.loveCount).toBeGreaterThanOrEqual(0);
    expect(p.viewCount).toBeGreaterThanOrEqual(0);
  });

  it('produces a valid ISO createdAt', () => {
    const p = dummyPage('root');
    expect(() => new Date(p.createdAt).toISOString()).not.toThrow();
    expect(new Date(p.createdAt).toISOString()).toBe(p.createdAt);
  });
});
