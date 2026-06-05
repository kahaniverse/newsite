import { sql } from '@/lib/db/client';
import { Story, ContributorRole, Genre } from '@/lib/types';
import { parsePgTextArray, isUuid } from '@/lib/db/parse';

function rowToStory(row: Record<string, unknown>): Story {
  const contributors = (row.contributors as Array<{
    author_id: string; display_name: string; avatar_image: string; role: string;
  }> | null) ?? [];

  return {
    id:       row.id as string,
    title:    row.title as string,
    synopsis: row.synopsis as string,
    coverImage: row.cover_image as string | undefined,
    genreTags:  parsePgTextArray(row.genre_tags) as Genre[],
    status:   row.status as Story['status'],
    universe: {
      id:   row.universe_id as string,
      slug: row.universe_slug as string,
      name: row.universe_name as string,
    },
    contributors: contributors.map(c => ({
      author: { id: c.author_id, displayName: c.display_name, avatarImage: c.avatar_image },
      role:   c.role as ContributorRole,
    })),
    loveCount:   Number(row.love_count),
    followCount: Number(row.follow_count),
    viewCount:   Number(row.view_count),
    pageCount:   Number(row.page_count),
    createdAt:   (row.created_at as Date).toISOString(),
  };
}

export async function getStories({
  universeId, page = 1, limit = 10, status, q,
}: {
  universeId?: string; page?: number; limit?: number;
  status?: string; q?: string;
}): Promise<{ data: Story[]; total: number }> {
  const offset = (page - 1) * limit;
  // Single round-trip: COUNT(*) OVER() yields the unpaginated total per row,
  // replacing the second sequential count query to Neon.
  const rows = await sql`
    SELECT s.*,
           u.slug AS universe_slug, u.name AS universe_name,
           COUNT(*) OVER() AS total_count,
           (
             SELECT json_agg(json_build_object(
               'author_id', a.id, 'display_name', a.display_name,
               'avatar_image', a.avatar_image, 'role', sc.role
             ))
             FROM story_contributors sc
             JOIN authors a ON a.id = sc.author_id
             WHERE sc.story_id = s.id AND sc.accepted_at IS NOT NULL
           ) AS contributors
    FROM stories s
    JOIN universes u ON u.id = s.universe_id
    WHERE (${universeId ?? null}::uuid IS NULL OR s.universe_id = ${universeId ?? null}::uuid)
      AND (${status ?? null}::story_status IS NULL OR s.status = ${status ?? null}::story_status)
      AND (${q ?? null}::text IS NULL OR s.title ILIKE ${'%' + (q ?? '') + '%'})
    ORDER BY s.view_count DESC, s.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return {
    data:  rows.map(rowToStory),
    total: rows.length ? Number(rows[0].total_count) : 0,
  };
}

export async function getStoryById(id: string): Promise<Story | null> {
  if (!isUuid(id)) return null;
  try {
    const rows = await sql`
      SELECT s.*,
             u.slug AS universe_slug, u.name AS universe_name,
             (
               SELECT json_agg(json_build_object(
                 'author_id', a.id, 'display_name', a.display_name,
                 'avatar_image', a.avatar_image, 'role', sc.role
               ))
               FROM story_contributors sc
               JOIN authors a ON a.id = sc.author_id
               WHERE sc.story_id = s.id AND sc.accepted_at IS NOT NULL
             ) AS contributors
      FROM stories s
      JOIN universes u ON u.id = s.universe_id
      WHERE s.id = ${id}
      LIMIT 1
    `;
    return rows.length ? rowToStory(rows[0]) : null;
  } catch (e) {
    console.error('getStoryById failed', e);
    return null;
  }
}

export async function createStory(data: {
  title: string; synopsis: string; universeId: string;
  genreTags: string[]; coverImage?: string; creatorId: string;
}): Promise<Story> {
  const rows = await sql`
    WITH ins AS (
      INSERT INTO stories (title, synopsis, universe_id, genre_tags, cover_image, status)
      VALUES (${data.title}, ${data.synopsis}, ${data.universeId},
              ${data.genreTags}, ${data.coverImage ?? null}, 'draft')
      RETURNING *
    ),
    contrib AS (
      INSERT INTO story_contributors (story_id, author_id, role, accepted_at)
      SELECT ins.id, ${data.creatorId}, 'creator', now() FROM ins
      RETURNING story_id
    ),
    bump AS (
      UPDATE universes SET story_count = story_count + 1
      WHERE id = ${data.universeId}
      RETURNING id
    )
    SELECT ins.*, u.slug AS universe_slug, u.name AS universe_name,
           json_build_array(json_build_object(
             'author_id', a.id, 'display_name', a.display_name,
             'avatar_image', a.avatar_image, 'role', 'creator'
           )) AS contributors
    FROM ins
    JOIN universes u ON u.id = ins.universe_id
    JOIN authors a   ON a.id = ${data.creatorId}
    WHERE EXISTS (SELECT 1 FROM contrib)
      AND EXISTS (SELECT 1 FROM bump)
  `;
  return rowToStory(rows[0]);
}

export async function updateStory(
  id: string,
  data: Partial<{ title: string; synopsis: string; coverImage: string; genreTags: string[]; status: string }>
): Promise<Story | null> {
  const rows = await sql`
    WITH upd AS (
      UPDATE stories SET
        title       = COALESCE(${data.title ?? null}, title),
        synopsis    = COALESCE(${data.synopsis ?? null}, synopsis),
        cover_image = COALESCE(${data.coverImage ?? null}, cover_image),
        genre_tags  = COALESCE(${data.genreTags ?? null}, genre_tags),
        status      = COALESCE(${data.status ?? null}::story_status, status)
      WHERE id = ${id}
      RETURNING *
    )
    SELECT upd.*, u.slug AS universe_slug, u.name AS universe_name,
           (SELECT json_agg(json_build_object(
              'author_id', a.id, 'display_name', a.display_name,
              'avatar_image', a.avatar_image, 'role', sc.role))
            FROM story_contributors sc JOIN authors a ON a.id = sc.author_id
            WHERE sc.story_id = upd.id AND sc.accepted_at IS NOT NULL) AS contributors
    FROM upd JOIN universes u ON u.id = upd.universe_id
  `;
  return rows.length ? rowToStory(rows[0]) : null;
}

export async function isStoryContributor(storyId: string, authorId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM story_contributors
    WHERE story_id = ${storyId} AND author_id = ${authorId} AND accepted_at IS NOT NULL
  `;
  return rows.length > 0;
}
