// Mirrors what `next dev` does for tsx-run scripts: loads .env.local then
// .env, without overwriting anything already in process.env.

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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
applyDotenv(join(cwd, '.env.local'));
applyDotenv(join(cwd, '.env'));
