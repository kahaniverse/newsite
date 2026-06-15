// Vitest globalSetup: applies the SQL schema to the test DB once for the
// entire integration run, instead of paying ~30s per test file.

import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { configureNeonForLocalDev } from '@/lib/db/configure-neon';
import { splitStatements } from '@/scripts/migrate';

export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL
    ?? 'postgres://postgres:postgres@localhost:55432/kahaniverse_test?sslmode=disable';
  process.env.DATABASE_URL          = url;
  process.env.DATABASE_URL_UNPOOLED = url;
  process.env.NEON_LOCAL_PROXY_URL ??= 'http://localhost:4455/sql';

  configureNeonForLocalDev(url);
  const sql = neon(url);

  await sql('DROP SCHEMA IF EXISTS public CASCADE');
  await sql('CREATE SCHEMA public');

  // Apply every migration in order so the test schema matches production.
  const dir   = join(process.cwd(), 'lib/db/migrations');
  const files = readdirSync(dir).filter(f => /^\d+.*\.sql$/.test(f)).sort();
  for (const file of files) {
    const ddl = readFileSync(join(dir, file), 'utf8');
    for (const stmt of splitStatements(ddl)) {
      await sql(stmt);
    }
  }
}
