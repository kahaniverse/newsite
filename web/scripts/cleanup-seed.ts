// Clean up content created by automated / dummy "seed" authors.
//
// Seed authors are flagged authors.is_seed = true (see migration
// 002_author_is_seed.sql). This script removes the content they generated:
//
//   1. Whole universes whose CREATOR is a seed author  → deleted (cascades to
//      stories, pages, characters, reactions).
//   2. Seed-authored stories sitting inside a REAL user's universe → deleted
//      per-universe, so a dummy story added "to drive engagement" can be swept
//      once the universe has enough genuine user content. (cascades to pages,
//      contributors, reactions). A story's creator = its story_contributors row
//      with role = 'creator'.
//
// Guards (so we never delete real users' work):
//   --min-real-stories <n>  A real universe is only cleaned once it has at
//                           least N stories created by NON-seed authors.
//                           Default 1. Use 0 to clean regardless.
//   (default)               A seed story that contains pages written by real
//                           authors (a human branched onto it) is SKIPPED.
//   --force                 Delete such stories anyway (drops the real pages).
//
// Scope / safety:
//   --universe <slug>       Limit everything to one universe.
//   --purge-authors         After cleanup, delete seed authors no longer
//                           referenced by any universe/page/character.
//   --apply                 Actually delete. WITHOUT this flag it is a DRY RUN
//                           that only prints what it would do.
//
// Run from the web/ directory:
//   npx tsx scripts/cleanup-seed.ts                       # dry run, everything
//   npx tsx scripts/cleanup-seed.ts --universe my-world   # dry run, one universe
//   npx tsx scripts/cleanup-seed.ts --apply               # do it

import './_load-env';
import { neon } from '@neondatabase/serverless';
import { configureNeonForLocalDev } from '../lib/db/configure-neon';

type Args = {
  apply: boolean;
  force: boolean;
  purgeAuthors: boolean;
  universe: string | null;
  minRealStories: number;
};

function parseArgs(argv: string[]): Args {
  const a: Args = {
    apply: false,
    force: false,
    purgeAuthors: false,
    universe: null,
    minRealStories: 1,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--apply':           a.apply = true; break;
      case '--force':           a.force = true; break;
      case '--purge-authors':   a.purgeAuthors = true; break;
      case '--universe':        a.universe = argv[++i] ?? null; break;
      case '--min-real-stories': {
        const n = Number(argv[++i]);
        if (!Number.isInteger(n) || n < 0) throw new Error('--min-real-stories needs a non-negative integer');
        a.minRealStories = n;
        break;
      }
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  configureNeonForLocalDev(url);
  const sql = neon(url);

  const tag = args.apply ? 'APPLY' : 'DRY RUN';
  console.log(`Cleanup seed content — ${tag}`);
  console.log(
    `  scope=${args.universe ?? 'all universes'}  minRealStories=${args.minRealStories}` +
    `  force=${args.force}  purgeAuthors=${args.purgeAuthors}\n`
  );

  // Make sure the flag exists (in case migration 002 hasn't been applied yet).
  const hasFlag = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'authors' AND column_name = 'is_seed' LIMIT 1
  `;
  if (!hasFlag.length) {
    throw new Error("authors.is_seed is missing — run `npm run db:migrate` first.");
  }

  let deletedUniverses = 0;
  let deletedStories = 0;
  let skippedStories = 0;

  // ── 1. Universes created by seed authors → delete whole universe ──────────
  const seedUniverses = await sql`
    SELECT u.id, u.slug, u.name, u.story_count
    FROM universes u
    JOIN authors a ON a.id = u.creator_id
    WHERE a.is_seed = true
      AND (${args.universe}::text IS NULL OR u.slug = ${args.universe})
    ORDER BY u.slug
  `;

  for (const u of seedUniverses) {
    console.log(`[universe] "${u.name}" (${u.slug}) — seed-owned, ${u.story_count} story(ies) → DELETE`);
    if (args.apply) {
      await sql`DELETE FROM universes WHERE id = ${u.id}`; // cascades stories/pages/characters/reactions
    }
    deletedUniverses++;
  }

  // ── 2. Seed-authored stories inside REAL users' universes ─────────────────
  // (skip universes already removed above — those creators are seed authors)
  const realUniverses = await sql`
    SELECT u.id, u.slug, u.name
    FROM universes u
    JOIN authors a ON a.id = u.creator_id
    WHERE a.is_seed = false
      AND (${args.universe}::text IS NULL OR u.slug = ${args.universe})
    ORDER BY u.slug
  `;

  for (const u of realUniverses) {
    // "Enough actual user content" guard: count stories created by real authors.
    const realStoryRows = await sql`
      SELECT count(*)::int AS n
      FROM stories s
      JOIN story_contributors sc ON sc.story_id = s.id AND sc.role = 'creator'
      JOIN authors a ON a.id = sc.author_id
      WHERE s.universe_id = ${u.id} AND a.is_seed = false
    `;
    const realStories = realStoryRows[0].n as number;

    // Seed-authored stories in this universe.
    const seedStories = await sql`
      SELECT s.id, s.title
      FROM stories s
      JOIN story_contributors sc ON sc.story_id = s.id AND sc.role = 'creator'
      JOIN authors a ON a.id = sc.author_id
      WHERE s.universe_id = ${u.id} AND a.is_seed = true
      ORDER BY s.title
    `;

    if (!seedStories.length) continue;

    if (realStories < args.minRealStories) {
      console.log(
        `[universe] "${u.name}" (${u.slug}) — ${seedStories.length} seed story(ies) ` +
        `but only ${realStories} real story(ies) (< ${args.minRealStories}) → SKIP universe`
      );
      skippedStories += seedStories.length;
      continue;
    }

    let touched = false;
    for (const s of seedStories) {
      // Protect human contributions: a seed story a real author has branched onto.
      const realPages = await sql`
        SELECT count(*)::int AS n
        FROM pages p
        JOIN authors a ON a.id = p.author_id
        WHERE p.story_id = ${s.id} AND a.is_seed = false
      `;
      const realPageCount = realPages[0].n as number;

      if (realPageCount > 0 && !args.force) {
        console.log(`  [story] "${s.title}" in ${u.slug} — has ${realPageCount} real-author page(s) → SKIP (use --force)`);
        skippedStories++;
        continue;
      }

      const note = realPageCount > 0 ? ` (--force: drops ${realPageCount} real page(s))` : '';
      console.log(`  [story] "${s.title}" in ${u.slug} — seed-authored → DELETE${note}`);
      if (args.apply) {
        await sql`DELETE FROM stories WHERE id = ${s.id}`; // cascades pages/contributors/reactions
      }
      deletedStories++;
      touched = true;
    }

    // Keep denormalised counts honest for this surviving universe.
    if (touched && args.apply) {
      await sql`UPDATE universes SET story_count = (SELECT count(*) FROM stories WHERE universe_id = ${u.id}) WHERE id = ${u.id}`;
    }
  }

  // ── 3. Optionally purge now-orphaned seed authors ────────────────────────
  let purgedAuthors = 0;
  if (args.purgeAuthors) {
    // ON DELETE RESTRICT on universes.creator_id / pages.author_id /
    // characters.creator_id means only truly-unreferenced authors are deletable.
    // Never touch the system author.
    const rows = args.apply
      ? await sql`
          DELETE FROM authors a
          WHERE a.is_seed = true
            AND a.auth_id <> 'system:kahaniverse'
            AND NOT EXISTS (SELECT 1 FROM universes  u WHERE u.creator_id = a.id)
            AND NOT EXISTS (SELECT 1 FROM pages      p WHERE p.author_id  = a.id)
            AND NOT EXISTS (SELECT 1 FROM characters c WHERE c.creator_id = a.id)
          RETURNING a.id
        `
      : await sql`
          SELECT a.id
          FROM authors a
          WHERE a.is_seed = true
            AND a.auth_id <> 'system:kahaniverse'
            AND NOT EXISTS (SELECT 1 FROM universes  u WHERE u.creator_id = a.id)
            AND NOT EXISTS (SELECT 1 FROM pages      p WHERE p.author_id  = a.id)
            AND NOT EXISTS (SELECT 1 FROM characters c WHERE c.creator_id = a.id)
        `;
    purgedAuthors = rows.length;
    console.log(`\n[authors] ${args.apply ? 'purged' : 'would purge'} ${purgedAuthors} orphaned seed author(s)`);
  }

  console.log(
    `\nSummary (${tag}): ` +
    `universes deleted=${deletedUniverses}, stories deleted=${deletedStories}, ` +
    `stories skipped=${skippedStories}` +
    (args.purgeAuthors ? `, authors purged=${purgedAuthors}` : '')
  );
  if (!args.apply) console.log('\nNo changes were made. Re-run with --apply to execute.');
}

main().catch(err => { console.error(err); process.exit(1); });
