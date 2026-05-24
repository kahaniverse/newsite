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
