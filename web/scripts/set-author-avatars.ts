// Sync seeded author profile pictures from scripts/seed-data.json into the DB.
//
// The main loader (seed-from-json.ts) inserts authors with ON CONFLICT DO
// NOTHING, so it never changes an author that already exists. This script is
// the easy lever for swapping avatars after the fact:
//
//   1. Drop an image in web/public/images/ (e.g. meera-rao.jpeg), or use any URL.
//   2. Set "avatarImage" on that author in scripts/seed-data.json.
//   3. Run:  npm run seed:avatars        (from web/)
//
// It UPDATEs avatar_image for every author in the JSON that has avatarImage set,
// matched by authId. Authors without avatarImage are left untouched.
// Pass an alternate JSON path as argv[2] if needed.

import './_load-env';
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { configureNeonForLocalDev } from '../lib/db/configure-neon';

type SeedAuthor = { authId: string; avatarImage?: string };

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  configureNeonForLocalDev(url);
  const sql = neon(url);

  const dataPath = process.argv[2] ?? join(process.cwd(), 'scripts', 'seed-data.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf8')) as { authors?: SeedAuthor[] };

  let updated = 0, missing = 0, skipped = 0;
  for (const a of data.authors ?? []) {
    if (!a.avatarImage) { skipped++; continue; }
    const r = await sql`
      UPDATE authors SET avatar_image = ${a.avatarImage}
      WHERE auth_id = ${a.authId}
      RETURNING id
    `;
    if (r.length) { updated++; console.log(`  ${a.authId} -> ${a.avatarImage}`); }
    else { missing++; console.log(`  (no such author, skipped) ${a.authId}`); }
  }
  console.log(`Avatars synced. Updated ${updated}, not-found ${missing}, no-avatar ${skipped}.`);
}

main().catch(err => { console.error(err); process.exit(1); });
