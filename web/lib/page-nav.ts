import type { Page } from '@/lib/types';

// Pages form a tree per story: one root (parentId === null), each page possibly
// branching into several children (alternate continuations). There is no stored
// page number — position is derived. The root is the story "concept" anchor and
// is page 0; its children are the "Beginnings" (page 1), their children page 2,
// and so on. The "main line" is the spine you get by following the earliest-
// created child at each step from the root; a page's number is its 0-based depth
// (root = 0, its child = 1, …), and the story's "last page" is the leaf at the
// end of that main line.
export interface PageNav {
  /** 0-based position of a page along the tree (root/concept = 0). 0 if unknown. */
  numberOf:    (pageId: string) => number;
  /** Parent of a page (null for the root, or when unknown). */
  parentOf:    (pageId: string) => string | null;
  /** Earliest-created child of a page (the main line). Null when it's a leaf. */
  firstChildOf: (pageId: string) => string | null;
  /** Pages sharing a page's parent (itself included), ordered by createdAt. For
   *  a beginning this is the full set of alternate beginnings (root's children). */
  siblingsOf:  (pageId: string) => Page[];
  /** The story's root/concept page id (page 0). Null when the story is empty. */
  rootId:      string | null;
  /** The leaf at the end of the main line. Null when the story has no pages. */
  lastPageId:  string | null;
  /** Position of the last main-line page (0 when the story is empty). */
  lastNumber:  number;
  /** True when pageId is that main-line last page. */
  isLast:      (pageId: string) => boolean;
  /** Total pages in the story. */
  total:       number;
}

export function buildPageNav(pages: Page[]): PageNav {
  const childrenOf = (id: string | null) =>
    pages
      .filter(p => p.parentId === id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const byId = new Map(pages.map(p => [p.id, p]));
  const root = pages.find(p => p.parentId === null) ?? null;

  // Depth (position) by breadth-first walk from the root — root is page 0.
  const depth = new Map<string, number>();
  if (root) {
    const queue: Array<[string, number]> = [[root.id, 0]];
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
    numberOf:     id => depth.get(id) ?? 0,
    parentOf:     id => byId.get(id)?.parentId ?? null,
    firstChildOf: id => childrenOf(id)[0]?.id ?? null,
    siblingsOf:   id => childrenOf(byId.get(id)?.parentId ?? null),
    rootId:       root?.id ?? null,
    lastPageId:   lastId,
    lastNumber:   lastId ? depth.get(lastId) ?? 0 : 0,
    isLast:       id => lastId !== null && id === lastId,
    total:        pages.length,
  };
}
