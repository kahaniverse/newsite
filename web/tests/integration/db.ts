// Shared helpers for DB-backed tests. Requires the docker stack to be up
// (postgres on :5432, neon-proxy on :4444). Tests use the `kahaniverse_test`
// database, which is created by infra/postgres-init/01-init.sql.

import { neon } from '@neondatabase/serverless';
import { configureNeonForLocalDev } from '@/lib/db/configure-neon';

// Point every test at the test DB regardless of what the dev env vars say.
const TEST_DB_URL = process.env.TEST_DATABASE_URL
  ?? 'postgres://postgres:postgres@localhost:55432/kahaniverse_test?sslmode=disable';
process.env.DATABASE_URL          = TEST_DB_URL;
process.env.DATABASE_URL_UNPOOLED = TEST_DB_URL;
process.env.NEON_LOCAL_PROXY_URL  ??= 'http://localhost:4455/sql';

configureNeonForLocalDev(TEST_DB_URL);
export const sql = neon(TEST_DB_URL);

// Schema is applied once globally by tests/integration/global-setup.ts.
// This is a no-op kept for backward compat with tests that still call it.
export async function ensureSchema(): Promise<void> {
  return;
}

export async function truncateAll(): Promise<void> {
  await sql`
    TRUNCATE TABLE
      reactions, story_characters, story_contributors,
      pages, characters, stories, universes, authors
    RESTART IDENTITY CASCADE
  `;
}

// Convenience: create an author with a known id for joining stories/pages to.
export async function makeAuthor(overrides: Partial<{
  displayName: string;
  authId:      string;
}> = {}): Promise<{ id: string; displayName: string }> {
  const displayName = overrides.displayName ?? `Test Author ${Math.random().toString(36).slice(2, 8)}`;
  const authId      = overrides.authId      ?? `test:${displayName}`;
  const rows = await sql`
    INSERT INTO authors (auth_id, display_name)
    VALUES (${authId}, ${displayName})
    RETURNING id, display_name
  `;
  return { id: rows[0].id as string, displayName: rows[0].display_name as string };
}

export async function makeUniverse(creatorId: string, overrides: Partial<{
  slug: string; name: string;
}> = {}): Promise<{ id: string; slug: string }> {
  const slug = overrides.slug ?? `u-${Math.random().toString(36).slice(2, 8)}`;
  const name = overrides.name ?? slug;
  const rows = await sql`
    INSERT INTO universes (slug, name, concept, cover_image, creator_id, genres)
    VALUES (${slug}, ${name}, 'concept', '/img.png', ${creatorId}, ARRAY['scienceFiction']::genre[])
    RETURNING id, slug
  `;
  return { id: rows[0].id as string, slug: rows[0].slug as string };
}

// Insert a story plus its creator contributor row (so isStoryContributor passes).
export async function makeStory(universeId: string, creatorId: string, overrides: Partial<{
  title: string; status: string;
}> = {}): Promise<{ id: string; title: string }> {
  const title  = overrides.title  ?? `Story ${Math.random().toString(36).slice(2, 8)}`;
  const status = overrides.status ?? 'published';
  const rows = await sql`
    WITH ins AS (
      INSERT INTO stories (title, synopsis, universe_id, genre_tags, status)
      VALUES (${title}, 'syn', ${universeId}, ARRAY[]::genre[], ${status}::story_status)
      RETURNING id, title
    ),
    contrib AS (
      INSERT INTO story_contributors (story_id, author_id, role, accepted_at)
      SELECT id, ${creatorId}, 'creator', now() FROM ins
      RETURNING story_id
    ),
    bump AS (
      UPDATE universes SET story_count = story_count + 1
      WHERE id = ${universeId}
      RETURNING id
    )
    SELECT ins.id, ins.title FROM ins
    WHERE EXISTS (SELECT 1 FROM contrib) AND EXISTS (SELECT 1 FROM bump)
  `;
  return { id: rows[0].id as string, title: rows[0].title as string };
}

export async function makePage(storyId: string, authorId: string, overrides: Partial<{
  parentId: string | null; content: string;
}> = {}): Promise<{ id: string }> {
  const parentId = overrides.parentId ?? null;
  const content  = overrides.content  ?? 'page content';
  const rows = await sql`
    INSERT INTO pages (story_id, parent_id, content, author_id)
    VALUES (${storyId}, ${parentId}, ${content}, ${authorId})
    RETURNING id
  `;
  return { id: rows[0].id as string };
}
