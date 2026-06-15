// Loads dotenv files for tsx-run scripts (db:migrate, db:seed, …), without
// overwriting anything already in process.env.
//
//   default  → .env.local, then .env   (mirrors `next dev`: local stack)
//   prod     → .env.production, then .env   (.env.local is skipped so its
//              localhost DATABASE_URL can't shadow the production one)
//
// Select prod with the `--prod` / `--env=production` CLI flag or APP_ENV=production
// (e.g. `npm run db:migrate:prod`).

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const isProd =
  process.env.APP_ENV === 'production' ||
  process.argv.includes('--prod') ||
  process.argv.includes('--env=production');

function applyDotenv(file: string): void {
  if (!existsSync(file)) return;
  const txt = readFileSync(file, 'utf8');
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val   = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const cwd = process.cwd();
if (isProd) {
  console.log('[env] target: production (.env.production)');
  applyDotenv(join(cwd, '.env.production'));
} else {
  applyDotenv(join(cwd, '.env.local'));
}
applyDotenv(join(cwd, '.env'));
