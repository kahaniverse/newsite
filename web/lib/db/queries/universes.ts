import { sql } from '@/lib/db/client';
import { Genre, Universe } from '@/lib/types';
import { parsePgTextArray } from '@/lib/db/parse';
import { getCache, setCache, TTL, CacheKeys } from '@/lib/redis/cache';
import { promoteTier } from '@/lib/db/queries/authors';
import { personaIncludesMature, type Persona } from '@/lib/persona';

function rowToUniverse(row: Record<string, unknown>): Universe {
  return {
    id:          row.id as string,
    slug:        row.slug as string,
    name:        row.name as string,
    concept:     row.concept as string,
    coverImage:  row.cover_image as string,
    era:         row.era as string | undefined,
    world:       row.world as string | undefined,
    genres:      parsePgTextArray(row.genres) as Genre[],
    creator: {
      id:          row.creator_id as string,
      displayName: row.creator_name as string,
      avatarImage: row.creator_avatar as string | undefined,
    },
    isMature:    row.is_mature === true,
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
  includeMature = true,
}: {
  page?:     number;
  limit?:    number;
  genre?:    string;
  q?:        string;
  featured?: boolean;
  /** false = Kid persona: hide author-rated mature universes. Default shows all. */
  includeMature?: boolean;
}): Promise<{ data: Universe[]; total: number }> {
  const offset = (page - 1) * limit;

  // "Featured" picks the most-viewed universes that have at least one story.
  const featuredFlag = featured ?? false;
  const genreParam = genre ?? null;
  // Single round-trip: COUNT(*) OVER() returns the unpaginated total on every
  // row, so we don't pay a second sequential query to Neon for the page count.
  const rows = await sql`
    SELECT u.*,
           a.display_name AS creator_name,
           a.avatar_image AS creator_avatar,
           COUNT(*) OVER() AS total_count
    FROM universes u
    JOIN authors a ON a.id = u.creator_id
    WHERE (${q ?? null}::text IS NULL OR u.name ILIKE ${'%' + (q ?? '') + '%'})
      AND (${genreParam}::text IS NULL OR ${genreParam}::genre = ANY(u.genres))
      AND (${featuredFlag}::boolean = false OR u.story_count > 0)
      AND (${includeMature}::boolean OR u.is_mature = false)
    ORDER BY
      CASE WHEN ${featuredFlag}::boolean THEN u.view_count + u.love_count ELSE u.view_count END DESC,
      u.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return {
    data:  rows.map(rowToUniverse),
    total: rows.length ? Number(rows[0].total_count) : 0,
  };
}

export interface UniversesPayload {
  data: Universe[]; total: number; page: number; limit: number; hasMore: boolean;
}

/**
 * Size of the canonical featured list. The home page, the browse carousel, and
 * MoreUniverses all request exactly this many featured universes, and it's the
 * only featured shape cached under `cache:universes:featured`. Client fetches
 * that hard-code `&limit=5` must stay in sync with this value (otherwise they
 * simply bypass the shared cache — still correct, just uncached).
 */
export const FEATURED_LIMIT = 5;

/**
 * Cache-aside accessor for THE featured universe list (page 1, {@link FEATURED_LIMIT}
 * items, unfiltered) shown on the home/browse screen. Reads
 * `cache:universes:featured` first (5 min TTL) and only hits Neon on a miss, so
 * the dynamic home dashboard isn't re-querying the DB on every request. This is
 * the single source of truth for that cache entry — the `/api/universes` route
 * delegates its canonical featured request here rather than caching ad-hoc,
 * which is why the key only ever holds one well-defined payload. Invalidate via
 * the route's mutation handlers.
 */
export async function getFeaturedUniverses(persona: Persona = 'grownup'): Promise<UniversesPayload> {
  // Cache per persona — the Kid list (mature universes hidden) and the Grown-up
  // list are different payloads and must not share one entry. Both are
  // invalidated together on mutation (see CacheKeys.featuredUniverses usage).
  const includeMature = personaIncludesMature(persona);
  const key = CacheKeys.featuredUniverses(persona);
  const cached = await getCache<UniversesPayload>(key);
  if (cached) return cached;

  const result  = await getUniverses({ page: 1, limit: FEATURED_LIMIT, featured: true, includeMature });
  const payload: UniversesPayload = {
    ...result, page: 1, limit: FEATURED_LIMIT, hasMore: result.total > FEATURED_LIMIT,
  };
  await setCache(key, payload, TTL.featuredUniverses);
  return payload;
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
  isMature?:  boolean;
  creatorId:  string;
}): Promise<Universe> {
  const rows = await sql`
    WITH ins AS (
      INSERT INTO universes (slug, name, concept, cover_image, era, world, genres, is_mature, creator_id)
      VALUES (${data.slug}, ${data.name}, ${data.concept}, ${data.coverImage},
              ${data.era ?? null}, ${data.world ?? null}, ${data.genres}, ${data.isMature ?? false}, ${data.creatorId})
      RETURNING *
    )
    SELECT ins.*, a.display_name AS creator_name, a.avatar_image AS creator_avatar
    FROM ins JOIN authors a ON a.id = ins.creator_id
  `;
  // Creating a universe earns the Creator tier (highest, this phase).
  await promoteTier(data.creatorId, 'creator');
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
