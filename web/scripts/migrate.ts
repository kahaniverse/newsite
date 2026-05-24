import './_load-env';
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { configureNeonForLocalDev } from '../lib/db/configure-neon';

export function splitStatements(ddl: string): string[] {
  const stmts: string[] = [];
  let buf = '';
  let i = 0;
  let inDollar = false;
  let inSingle = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (i < ddl.length) {
    const ch  = ddl[i];
    const nx  = ddl[i + 1];

    if (inLineComment) {
      buf += ch;
      if (ch === '\n') inLineComment = false;
      i++; continue;
    }
    if (inBlockComment) {
      buf += ch;
      if (ch === '*' && nx === '/') { buf += nx; i += 2; inBlockComment = false; continue; }
      i++; continue;
    }
    if (!inDollar && !inSingle && ch === '-' && nx === '-') {
      buf += ch; inLineComment = true; i++; continue;
    }
    if (!inDollar && !inSingle && ch === '/' && nx === '*') {
      buf += ch + nx; inBlockComment = true; i += 2; continue;
    }
    if (!inDollar && ch === "'") {
      // toggle single-quote string (handle '' escape)
      if (inSingle && nx === "'") { buf += "''"; i += 2; continue; }
      inSingle = !inSingle;
      buf += ch; i++; continue;
    }
    if (!inSingle && ch === '$' && nx === '$') {
      inDollar = !inDollar;
      buf += '$$'; i += 2; continue;
    }
    if (!inDollar && !inSingle && ch === ';') {
      const stmt = buf.trim();
      if (stmt) stmts.push(stmt);
      buf = '';
      i++; continue;
    }
    buf += ch; i++;
  }
  const tail = buf.trim();
  if (tail) stmts.push(tail);
  return stmts;
}

async function migrate() {
  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error('DATABASE_URL_UNPOOLED is not set');

  configureNeonForLocalDev(url);
  const sql  = neon(url);
  const file = join(process.cwd(), 'lib/db/migrations/001_initial.sql');
  const ddl  = readFileSync(file, 'utf8');

  console.log('Running migration…');
  const stmts = splitStatements(ddl);

  for (const stmt of stmts) {
    try {
      await sql(stmt);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('already exists')) {
        console.log(`  skip (already exists): ${stmt.slice(0, 60)}…`);
        continue;
      }
      throw e;
    }
  }
  console.log('Migration complete.');
}

// Only auto-run when invoked directly (e.g. `npm run db:migrate`),
// not when imported by tests.
if (require.main === module) {
  migrate().catch(err => { console.error(err); process.exit(1); });
}
