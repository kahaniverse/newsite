// Reusable, idempotent seed loader for hand-authored content.
//
// Reads scripts/seed-data.json (path overridable as argv[2]) and inserts
// authors → universes → characters → stories → contributors → page trees.
// Mirrors the insert patterns in scripts/seed.ts and is safe to re-run:
//   - authors      → ON CONFLICT (auth_id) DO NOTHING
//   - universes    → ON CONFLICT (slug)    DO NOTHING, id fetched back
//   - stories      → skipped if (title, universe_id) already exists
//   - pages        → inserted ONLY for newly-created stories (the unique
//                    root-per-story index makes partial re-seeds unsafe)
// Denormalised counts (story_count, page_count, character_count) are
// recomputed from actual rows at the end, so they are always correct.
//
// Run from the web/ directory:  npx tsx scripts/seed-from-json.ts
//
// This file is generated/placed by the /seed-content skill. Edit the JSON,
// not this loader, to change content.

import './_load-env';
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { configureNeonForLocalDev } from '../lib/db/configure-neon';

const SYSTEM_AUTHOR_ID = '00000000-0000-0000-0000-000000000001';

const VALID_GENRES = new Set([
  'fantasy', 'scienceFiction', 'romance', 'thriller', 'horror',
  'mystery', 'adventure', 'historical', 'literary', 'other',
]);
const VALID_STATUS = new Set(['draft', 'published', 'completed', 'abandoned']);

type Page = {
  content: string;
  illustration?: string;
  authorAuthId?: string;
  disallowNext?: boolean;
  disallowAlternate?: boolean;
  loveCount?: number;
  viewCount?: number;
  children?: Page[];
};

type Story = {
  title: string;
  synopsis: string;
  coverImage?: string;
  genreTags?: string[];
  status?: string;
  authorAuthId?: string;
  loveCount?: number;
  followCount?: number;
  viewCount?: number;
  rootPage?: Page;
};

type Character = {
  name: string;
  image: string;
  description?: string;
  creatorAuthId?: string;
};

type Universe = {
  slug: string;
  name: string;
  concept: string;
  coverImage: string;
  era?: string;
  world?: string;
  genres?: string[];
  creatorAuthId?: string;
  loveCount?: number;
  followCount?: number;
  viewCount?: number;
  characters?: Character[];
  stories?: Story[];
};

type SeedData = {
  authors?: Array<{
    authId: string;
    displayName: string;
    bio?: string;
    avatarImage?: string;
    followCount?: number;
    loveCount?: number;
  }>;
  universes?: Universe[];
};

function validateGenres(genres: string[] | undefined, where: string): string[] {
  const g = genres ?? [];
  for (const x of g) {
    if (!VALID_GENRES.has(x)) {
      throw new Error(`Invalid genre "${x}" in ${where}. Valid: ${[...VALID_GENRES].join(', ')}`);
    }
  }
  return g;
}

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  configureNeonForLocalDev(url);
  const sql = neon(url);

  const dataPath = process.argv[2] ?? join(process.cwd(), 'scripts', 'seed-data.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf8')) as SeedData;

  console.log(`Seeding from ${dataPath} … (idempotent — safe to re-run)`);

  // System author (creator fallback). is_seed = true so seeded content is cleanable.
  await sql`
    INSERT INTO authors (id, auth_id, display_name, bio, is_seed)
    VALUES (${SYSTEM_AUTHOR_ID}, 'system:kahaniverse', 'Kahaniverse',
            'The official Kahaniverse account. Starter universes for the community.', true)
    ON CONFLICT (auth_id) DO NOTHING
  `;

  // Authors → authId → id map.
  const authorIds: Record<string, string> = { 'system:kahaniverse': SYSTEM_AUTHOR_ID };
  for (const a of data.authors ?? []) {
    const avatar = a.avatarImage ?? `https://i.pravatar.cc/240?u=${encodeURIComponent(a.authId)}`;
    await sql`
      INSERT INTO authors (auth_id, display_name, bio, avatar_image, follow_count, love_count)
      VALUES (${a.authId}, ${a.displayName}, ${a.bio ?? null}, ${avatar},
              ${a.followCount ?? 0}, ${a.loveCount ?? 0})
      ON CONFLICT (auth_id) DO NOTHING
    `;
    const r = await sql`SELECT id FROM authors WHERE auth_id = ${a.authId} LIMIT 1`;
    authorIds[a.authId] = r[0].id as string;
  }

  const resolveAuthor = (authId?: string) =>
    (authId && authorIds[authId]) || SYSTEM_AUTHOR_ID;

  const touchedUniverseIds = new Set<string>();
  const touchedStoryIds = new Set<string>();

  for (const u of data.universes ?? []) {
    const genres = validateGenres(u.genres, `universe "${u.slug}"`);
    const creatorId = resolveAuthor(u.creatorAuthId);

    const rows = await sql`
      INSERT INTO universes (slug, name, concept, cover_image, era, world, genres,
                             creator_id, love_count, follow_count, view_count)
      VALUES (${u.slug}, ${u.name}, ${u.concept}, ${u.coverImage},
              ${u.era ?? null}, ${u.world ?? null}, ${genres as unknown as string[]},
              ${creatorId}, ${u.loveCount ?? 0}, ${u.followCount ?? 0}, ${u.viewCount ?? 0})
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `;
    let universeId: string;
    if (rows.length) universeId = rows[0].id as string;
    else {
      const r = await sql`SELECT id FROM universes WHERE slug = ${u.slug}`;
      universeId = r[0].id as string;
    }
    touchedUniverseIds.add(universeId);

    // Characters (idempotent by name within universe).
    for (const c of u.characters ?? []) {
      const dupe = await sql`
        SELECT id FROM characters WHERE universe_id = ${universeId} AND name = ${c.name} LIMIT 1
      `;
      if (dupe.length) continue;
      await sql`
        INSERT INTO characters (name, image, description, universe_id, creator_id)
        VALUES (${c.name}, ${c.image}, ${c.description ?? null}, ${universeId},
                ${resolveAuthor(c.creatorAuthId)})
      `;
    }

    // Stories + page trees.
    for (const s of u.stories ?? []) {
      const status = s.status ?? 'published';
      if (!VALID_STATUS.has(status)) {
        throw new Error(`Invalid status "${status}" in story "${s.title}". Valid: ${[...VALID_STATUS].join(', ')}`);
      }
      const genreTags = validateGenres(s.genreTags, `story "${s.title}"`);
      const authorId = resolveAuthor(s.authorAuthId);

      const dupe = await sql`
        SELECT id FROM stories WHERE universe_id = ${universeId} AND title = ${s.title} LIMIT 1
      `;
      if (dupe.length) {
        touchedStoryIds.add(dupe[0].id as string);
        continue; // story (and its pages) already seeded — skip to keep re-runs clean
      }

      const storyRows = await sql`
        INSERT INTO stories (title, synopsis, cover_image, genre_tags, status, universe_id,
                             love_count, follow_count, view_count)
        VALUES (${s.title}, ${s.synopsis}, ${s.coverImage ?? null},
                ${genreTags as unknown as string[]}, ${status}, ${universeId},
                ${s.loveCount ?? 0}, ${s.followCount ?? 0}, ${s.viewCount ?? 0})
        RETURNING id
      `;
      const storyId = storyRows[0].id as string;
      touchedStoryIds.add(storyId);

      await sql`
        INSERT INTO story_contributors (story_id, author_id, role, accepted_at)
        VALUES (${storyId}, ${authorId}, 'creator', now())
        ON CONFLICT DO NOTHING
      `;

      // Branching page tree. Root has parent_id NULL.
      const insertPage = async (page: Page, parentId: string | null): Promise<void> => {
        // A page without its own author inherits the story's author (not system).
        const pageAuthor = (page.authorAuthId && authorIds[page.authorAuthId]) || authorId;
        const rows = await sql`
          INSERT INTO pages (story_id, parent_id, content, illustration,
                             disallow_next, disallow_alternate, author_id, love_count, view_count)
          VALUES (${storyId}, ${parentId}, ${page.content}, ${page.illustration ?? null},
                  ${page.disallowNext ?? false}, ${page.disallowAlternate ?? false},
                  ${pageAuthor}, ${page.loveCount ?? 0}, ${page.viewCount ?? 0})
          RETURNING id
        `;
        const pageId = rows[0].id as string;
        for (const child of page.children ?? []) {
          await insertPage(child, pageId);
        }
      };

      const root: Page = s.rootPage ?? {
        content: `This is the beginning of "${s.title}". The first words of this story are yet to be written. Be the author who starts it.`,
        authorAuthId: s.authorAuthId,
      };
      await insertPage(root, null);
    }
  }

  // Recompute denormalised counts from actual rows (idempotent).
  for (const sid of touchedStoryIds) {
    await sql`UPDATE stories SET page_count = (SELECT count(*) FROM pages WHERE story_id = ${sid}) WHERE id = ${sid}`;
  }
  for (const uid of touchedUniverseIds) {
    await sql`UPDATE universes SET story_count = (SELECT count(*) FROM stories WHERE universe_id = ${uid}) WHERE id = ${uid}`;
    await sql`UPDATE universes SET character_count = (SELECT count(*) FROM characters WHERE universe_id = ${uid}) WHERE id = ${uid}`;
  }

  console.log(`Seed complete. Universes touched: ${touchedUniverseIds.size}, stories: ${touchedStoryIds.size}.`);
}

main().catch(err => { console.error(err); process.exit(1); });
