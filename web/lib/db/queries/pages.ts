import { sql } from '@/lib/db/client';
import { Page } from '@/lib/types';
import { isUuid } from '@/lib/db/parse';
import { promoteTier } from '@/lib/db/queries/authors';

function rowToPage(row: Record<string, unknown>, children: Page[] = []): Page {
  return {
    id:                row.id as string,
    storyId:           row.story_id as string,
    parentId:          (row.parent_id as string | null) ?? null,
    content:           row.content as string,
    illustration:      row.illustration as string | undefined,
    disallowNext:      Boolean(row.disallow_next),
    disallowAlternate: Boolean(row.disallow_alternate),
    author: {
      id:          row.author_id as string,
      displayName: row.display_name as string,
      avatarImage: row.avatar_image as string | undefined,
    },
    loveCount:  Number(row.love_count),
    viewCount:  Number(row.view_count),
    children,
    createdAt:  (row.created_at as Date).toISOString(),
  };
}

export async function getPageById(id: string): Promise<Page | null> {
  if (!isUuid(id)) return null;
  try {
    const rows = await sql`
      SELECT p.*, a.display_name, a.avatar_image
      FROM pages p JOIN authors a ON a.id = p.author_id
      WHERE p.id = ${id} LIMIT 1
    `;
    if (!rows.length) return null;

    const children = await sql`
      SELECT p.*, a.display_name, a.avatar_image
      FROM pages p JOIN authors a ON a.id = p.author_id
      WHERE p.parent_id = ${id}
      ORDER BY p.created_at ASC
    `;
    return rowToPage(rows[0], children.map(c => rowToPage(c)));
  } catch (e) {
    console.error('getPageById failed', e);
    return null;
  }
}

export async function getPagesByStory(storyId: string): Promise<Page[]> {
  if (!isUuid(storyId)) return [];
  try {
    const rows = await sql`
      SELECT p.*, a.display_name, a.avatar_image
      FROM pages p JOIN authors a ON a.id = p.author_id
      WHERE p.story_id = ${storyId}
      ORDER BY p.created_at ASC
    `;
    return rows.map(r => rowToPage(r));
  } catch (e) {
    console.error('getPagesByStory failed', e);
    return [];
  }
}

export interface BeginningsPayload {
  root:    Page | null;
  data:    Page[];   // root's direct children (the alternate beginnings), paginated
  total:   number;
  page:    number;
  limit:   number;
  hasMore: boolean;
}

/**
 * Paginated "beginnings" of a story: its root page plus a page-by-page slice of
 * the root's direct children (the alternate opening branches). Lets the story
 * detail panel infinite-scroll the beginnings instead of fetching the entire
 * page tree up front. `root` is repeated on every page so the caller can render
 * it as the list header regardless of which slice loaded first.
 */
export async function getStoryBeginnings(
  storyId: string,
  { page = 1, limit = 8 }: { page?: number; limit?: number } = {},
): Promise<BeginningsPayload> {
  const empty: BeginningsPayload = { root: null, data: [], total: 0, page, limit, hasMore: false };
  if (!isUuid(storyId)) return empty;
  try {
    const rootRows = await sql`
      SELECT p.*, a.display_name, a.avatar_image
      FROM pages p JOIN authors a ON a.id = p.author_id
      WHERE p.story_id = ${storyId} AND p.parent_id IS NULL
      LIMIT 1
    `;
    if (!rootRows.length) return empty;
    const root = rowToPage(rootRows[0]);

    const offset = (page - 1) * limit;
    const childRows = await sql`
      SELECT p.*, a.display_name, a.avatar_image, COUNT(*) OVER() AS total_count
      FROM pages p JOIN authors a ON a.id = p.author_id
      WHERE p.parent_id = ${root.id}
      ORDER BY p.created_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const total = childRows.length ? Number(childRows[0].total_count) : 0;
    return {
      root,
      data:    childRows.map(r => rowToPage(r)),
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  } catch (e) {
    console.error('getStoryBeginnings failed', e);
    return empty;
  }
}

export async function createPage(data: {
  storyId:      string;
  parentId:     string | null;
  content:      string;
  illustration?: string;
  authorId:     string;
}): Promise<Page> {
  // The schema FKs parent_id → pages(id) with a single NULL-parent root per
  // story. That root is the story "concept" anchor (page 0) and is never an
  // authored page itself — every authored page hangs off it (page 1 = the
  // "Beginnings") or deeper. Callers pass parentId === storyId as the "begin /
  // from the story" sentinel; resolve it to the root's id, creating the concept
  // anchor first if the story has no pages yet.
  let parent: string | null = data.parentId;
  if (parent === data.storyId) {
    const root = await sql`
      SELECT id FROM pages WHERE story_id = ${data.storyId} AND parent_id IS NULL LIMIT 1
    `;
    if (root.length) {
      parent = root[0].id as string;
    } else {
      // No concept anchor yet — create the page-0 root (not counted toward the
      // story's page_count), then hang this first authored page off it.
      const created = await sql`
        INSERT INTO pages (story_id, parent_id, content, author_id)
        VALUES (${data.storyId}, NULL,
                '(Story concept — add pages to begin this story.)', ${data.authorId})
        RETURNING id
      `;
      parent = created[0].id as string;
    }
  }

  const rows = await sql`
    WITH ins AS (
      INSERT INTO pages (story_id, parent_id, content, illustration, author_id)
      VALUES (${data.storyId}, ${parent}, ${data.content},
              ${data.illustration ?? null}, ${data.authorId})
      RETURNING *
    ),
    bump AS (
      UPDATE stories SET page_count = page_count + 1 WHERE id = ${data.storyId} RETURNING id
    )
    SELECT ins.*, a.display_name, a.avatar_image
    FROM ins JOIN authors a ON a.id = ins.author_id
    WHERE EXISTS (SELECT 1 FROM bump)
  `;
  // Authoring a page earns (at least) the Writer tier.
  await promoteTier(data.authorId, 'writer');
  return rowToPage(rows[0]);
}

export async function updatePage(
  id: string,
  data: Partial<{ content: string; illustration: string }>
): Promise<Page | null> {
  const rows = await sql`
    WITH upd AS (
      UPDATE pages SET
        content      = COALESCE(${data.content ?? null}, content),
        illustration = COALESCE(${data.illustration ?? null}, illustration)
      WHERE id = ${id}
      RETURNING *
    )
    SELECT upd.*, a.display_name, a.avatar_image
    FROM upd JOIN authors a ON a.id = upd.author_id
  `;
  return rows.length ? rowToPage(rows[0]) : null;
}
