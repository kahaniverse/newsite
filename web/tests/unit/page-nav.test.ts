import { describe, it, expect } from 'vitest';
import { buildPageNav } from '@/lib/page-nav';
import type { Page } from '@/lib/types';

// Build a minimal Page. createdAt drives sibling ordering / the main line.
function mk(id: string, parentId: string | null, createdAt: string): Page {
  return {
    id, storyId: 'story', parentId, content: id,
    disallowNext: false, disallowAlternate: false,
    author: { id: 'a', displayName: 'A' },
    loveCount: 0, viewCount: 0, children: [], createdAt,
  };
}

// Tree:
//   root (page 0, concept)
//   ├─ b1 (page 1, first beginning)         [main line]
//   │   ├─ p2a (page 2)                      [main line]
//   │   └─ p2b (page 2, alternate)
//   └─ b2 (page 1, alternate beginning)
const root = mk('root', null,   '2024-01-01');
const b1   = mk('b1',   'root', '2024-01-02');
const b2   = mk('b2',   'root', '2024-01-03');
const p2a  = mk('p2a',  'b1',   '2024-01-04');
const p2b  = mk('p2b',  'b1',   '2024-01-05');
const pages = [root, b1, b2, p2a, p2b];

describe('buildPageNav (root = page 0)', () => {
  const nav = buildPageNav(pages);

  it('numbers the root as 0 (concept) and beginnings as 1', () => {
    expect(nav.numberOf('root')).toBe(0);
    expect(nav.numberOf('b1')).toBe(1);
    expect(nav.numberOf('b2')).toBe(1);
    expect(nav.numberOf('p2a')).toBe(2);
  });

  it('rootId points at the concept page', () => {
    expect(nav.rootId).toBe('root');
  });

  it('parentOf walks one level up (null at the root)', () => {
    expect(nav.parentOf('p2a')).toBe('b1');
    expect(nav.parentOf('b1')).toBe('root');
    expect(nav.parentOf('root')).toBeNull();
  });

  it('firstChildOf returns the earliest-created child (the main line)', () => {
    expect(nav.firstChildOf('root')).toBe('b1');
    expect(nav.firstChildOf('b1')).toBe('p2a');
    expect(nav.firstChildOf('p2a')).toBeNull(); // leaf
  });

  it('siblingsOf returns same-level alternates ordered by createdAt', () => {
    expect(nav.siblingsOf('b1').map(p => p.id)).toEqual(['b1', 'b2']);
    expect(nav.siblingsOf('p2a').map(p => p.id)).toEqual(['p2a', 'p2b']);
  });

  it('tracks the main line for the last page', () => {
    expect(nav.lastPageId).toBe('p2a');
    expect(nav.lastNumber).toBe(2);
    expect(nav.isLast('p2a')).toBe(true);
    expect(nav.isLast('p2b')).toBe(false);
    expect(nav.total).toBe(5);
  });

  it('numberOf returns 0 for unknown ids', () => {
    expect(nav.numberOf('nope')).toBe(0);
  });
});
