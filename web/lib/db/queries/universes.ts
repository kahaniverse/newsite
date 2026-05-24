import { sql } from '@/lib/db/client';
import { Genre, Universe } from '@/lib/types';

function rowToUniverse(row: Record<string, unknown>): Universe {
  return {
    id:          row.id as string,
    slug:        row.slug as string,
    name:        row.name as string,
    concept:     row.concept as string,
    coverImage:  row.cover_image as string,
    era:         row.era as string | undefined,
    world:       row.world as string | undefined,
    genres:      (row.genres as Genre[]) ?? [],
    creator: {
      id:          row.creator_id as string,
      displayName: row.creator_name as string,
      avatarImage: row.creator_avatar as string | undefined,
    },
    loveCount:   Number(row.love_count),
    followCount: Number(row.follow_count),
    viewCount:   Number(row.view_count),
    storyCount:  Number(row.story_count),
    createdAt:   (row.created_at as Date).toISOString(),
  };
}

export async function getUniverses({
  page    = 1,
  limit   = 10,
  genre,
  q,
  featured,
}: {
  page?:     number;
  limit?:    number;
  genre?:    string;
  q?:        string;
  featured?: boolean;
}): Promise<{ data: Universe[]; total: number }> {
  const offset = (page - 1) * limit;

  // "Featured" picks the most-viewed universes that have at least one story.
  const featuredFlag = featured ?? false;
  const rows = await sql`
    SELECT u.*,
           a.display_name AS creator_name,
           a.avatar_image AS creator_avatar
    FROM universes u
    JOIN authors a ON a.id = u.creator_id
    WHERE (${q ?? null}::text IS NULL OR u.name ILIKE ${'%' + (q ?? '') + '%'})
      AND (${genre ?? null}::text IS NULL OR ${genre ?? ''}::genre = ANY(u.genres))
      AND (${featuredFlag}::boolean = false OR u.story_count > 0)
    ORDER BY
      CASE WHEN ${featuredFlag}::boolean THEN u.view_count + u.love_count ELSE u.view_count END DESC,
      u.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countRows = await sql`
    SELECT COUNT(*) AS total FROM universes u
    WHERE (${q ?? null}::text IS NULL OR u.name ILIKE ${'%' + (q ?? '') + '%'})
      AND (${genre ?? null}::text IS NULL OR ${genre ?? ''}::genre = ANY(u.genres))
      AND (${featuredFlag}::boolean = false OR u.story_count > 0)
  `;

  return {
    data:  rows.map(rowToUniverse),
    total: Number(countRows[0].total),
  };
}

export async function getUniverseBySlug(slug: string): Promise<Universe | null> {
  const rows = await sql`
    SELECT u.*,
           a.display_name AS creator_name,
           a.avatar_image AS creator_avatar
    FROM universes u
    JOIN authors a ON a.id = u.creator_id
    WHERE u.slug = ${slug}
    LIMIT 1
  `;
  return rows.length ? rowToUniverse(rows[0]) : null;
}

export async function createUniverse(data: {
  slug:       string;
  name:       string;
  concept:    string;
  coverImage: string;
  era?:       string;
  world?:     string;
  genres:     string[];
  creatorId:  string;
}): Promise<Universe> {
  const rows = await sql`
    WITH ins AS (
      INSERT INTO universes (slug, name, concept, cover_image, era, world, genres, creator_id)
      VALUES (${data.slug}, ${data.name}, ${data.concept}, ${data.coverImage},
              ${data.era ?? null}, ${data.world ?? null}, ${data.genres}, ${data.creatorId})
      RETURNING *
    )
    SELECT ins.*, a.display_name AS creator_name, a.avatar_image AS creator_avatar
    FROM ins JOIN authors a ON a.id = ins.creator_id
  `;
  return rowToUniverse(rows[0]);
}

export async function updateUniverse(
  slug: string,
  data: Partial<{ name: string; concept: string; coverImage: string; era: string; world: string; genres: string[] }>
): Promise<Universe | null> {
  const rows = await sql`
    WITH upd AS (
      UPDATE universes SET
        name        = COALESCE(${data.name ?? null}, name),
        concept     = COALESCE(${data.concept ?? null}, concept),
        cover_image = COALESCE(${data.coverImage ?? null}, cover_image),
        era         = COALESCE(${data.era ?? null}, era),
        world       = COALESCE(${data.world ?? null}, world),
        genres      = COALESCE(${data.genres ?? null}, genres)
      WHERE slug = ${slug}
      RETURNING *
    )
    SELECT upd.*, a.display_name AS creator_name, a.avatar_image AS creator_avatar
    FROM upd JOIN authors a ON a.id = upd.creator_id
  `;
  return rows.length ? rowToUniverse(rows[0]) : null;
}

export async function getUniverseCount(): Promise<number> {
  const rows = await sql`SELECT COUNT(*) AS total FROM universes`;
  return Number(rows[0].total);
}

export async function deleteUniverseBySlug(slug: string): Promise<boolean> {
  const rows = await sql`DELETE FROM universes WHERE slug = ${slug} RETURNING id`;
  return rows.length > 0;
}
