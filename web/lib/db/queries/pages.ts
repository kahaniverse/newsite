import { sql } from '@/lib/db/client';
import { Page } from '@/lib/types';
import { isUuid } from '@/lib/db/parse';

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

export async function createPage(data: {
  storyId:      string;
  parentId:     string | null;
  content:      string;
  illustration?: string;
  authorId:     string;
}): Promise<Page> {
  // The schema FKs parent_id → pages(id) with a single NULL-parent root per
  // story. Callers pass parentId === storyId as the "begin / from the story"
  // sentinel; resolve it: create the root (NULL) if none exists yet,
  // otherwise hang the new page off the existing root.
  let parent: string | null = data.parentId;
  if (parent === data.storyId) {
    const root = await sql`
      SELECT id FROM pages WHERE story_id = ${data.storyId} AND parent_id IS NULL LIMIT 1
    `;
    parent = root.length ? (root[0].id as string) : null;
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
