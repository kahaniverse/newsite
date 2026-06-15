import type { Page } from '@/lib/types';

// Pages form a tree per story: one root (parentId === null), each page possibly
// branching into several children (alternate continuations). There is no stored
// page number — position is derived. The "main line" is the spine you get by
// following the earliest-created child at each step from the root; a page's
// number is its 1-based depth (root = 1, its child = 2, …), and the story's
// "last page" is the leaf at the end of that main line.
export interface PageNav {
  /** 1-based position of a page along the tree (root = 1). 0 if unknown. */
  numberOf:   (pageId: string) => number;
  /** The leaf at the end of the main line. Null when the story has no pages. */
  lastPageId: string | null;
  /** Position of the last main-line page (0 when the story is empty). */
  lastNumber: number;
  /** True when pageId is that main-line last page. */
  isLast:     (pageId: string) => boolean;
  /** Total pages in the story. */
  total:      number;
}

export function buildPageNav(pages: Page[]): PageNav {
  const childrenOf = (id: string | null) =>
    pages
      .filter(p => p.parentId === id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const root = pages.find(p => p.parentId === null) ?? null;

  // Depth (position) by breadth-first walk from the root.
  const depth = new Map<string, number>();
  if (root) {
    const queue: Array<[string, number]> = [[root.id, 1]];
    while (queue.length) {
      const [id, d] = queue.shift()!;
      if (depth.has(id)) continue;
      depth.set(id, d);
      for (const c of childrenOf(id)) queue.push([c.id, d + 1]);
    }
  }

  // Main line = follow the earliest-created child at each step to its leaf.
  let lastId = root?.id ?? null;
  for (let guard = 0; lastId && guard < 100_000; guard++) {
    const kids = childrenOf(lastId);
    if (!kids.length) break;
    lastId = kids[0].id;
  }

  return {
    numberOf:   id => depth.get(id) ?? 0,
    lastPageId: lastId,
    lastNumber: lastId ? depth.get(lastId) ?? 0 : 0,
    isLast:     id => lastId !== null && id === lastId,
    total:      pages.length,
  };
}
