// Dev convenience: drop and recreate the public schema in DATABASE_URL_UNPOOLED,
// then re-apply 001_initial.sql. Safe to run repeatedly.
//
// Refuses to run if the URL hostname doesn't look local.

import './_load-env';
import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { configureNeonForLocalDev } from '../lib/db/configure-neon';
import { splitStatements } from './migrate';

async function reset() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const host = new URL(url).hostname;
  const allowed = ['localhost', '127.0.0.1', 'db.localtest.me'];
  if (!allowed.includes(host)) {
    throw new Error(`Refusing to reset non-local DB (host: ${host})`);
  }

  configureNeonForLocalDev(url);
  const sql = neon(url);

  console.log('Dropping schema…');
  await sql('DROP SCHEMA IF EXISTS public CASCADE');
  await sql('CREATE SCHEMA public');

  const dir = join(process.cwd(), 'lib/db/migrations');
  const files = readdirSync(dir).filter(f => /^\d+.*\.sql$/.test(f)).sort();
  for (const file of files) {
    console.log(`Applying ${file}…`);
    const ddl = readFileSync(join(dir, file), 'utf8');
    for (const stmt of splitStatements(ddl)) {
      await sql(stmt);
    }
  }

  console.log('Reset complete.');
}

reset().catch(err => { console.error(err); process.exit(1); });
