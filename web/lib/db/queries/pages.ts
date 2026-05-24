import { sql } from '@/lib/db/client';
import { Page } from '@/lib/types';

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
}

export async function getPagesByStory(storyId: string): Promise<Page[]> {
  const rows = await sql`
    SELECT p.*, a.display_name, a.avatar_image
    FROM pages p JOIN authors a ON a.id = p.author_id
    WHERE p.story_id = ${storyId}
    ORDER BY p.created_at ASC
  `;
  return rows.map(r => rowToPage(r));
}

export async function createPage(data: {
  storyId:      string;
  parentId:     string | null;
  content:      string;
  illustration?: string;
  authorId:     string;
}): Promise<Page> {
  const rows = await sql`
    WITH ins AS (
      INSERT INTO pages (story_id, parent_id, content, illustration, author_id)
      VALUES (${data.storyId}, ${data.parentId}, ${data.content},
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
