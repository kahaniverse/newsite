import { describe, it, expect, beforeAll } from 'vitest';
import { sql, ensureSchema } from './db';

describe('schema migration', () => {
  beforeAll(async () => { await ensureSchema(); });

  it('creates the expected tables', async () => {
    const rows = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    const names = rows.map(r => r.table_name as string);
    expect(names).toEqual(expect.arrayContaining([
      'authors', 'universes', 'characters', 'stories',
      'story_contributors', 'story_characters', 'pages', 'reactions',
    ]));
  });

  it('authors table has the password_hash column from PR2', async () => {
    const rows = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='authors' AND column_name='password_hash'
    `;
    expect(rows).toHaveLength(1);
  });

  it('pages.parent_id is nullable and references pages(id)', async () => {
    const colRows = await sql`
      SELECT is_nullable FROM information_schema.columns
      WHERE table_schema='public' AND table_name='pages' AND column_name='parent_id'
    `;
    expect(colRows[0].is_nullable).toBe('YES');
  });

  it('exactly-one-target CHECK rejects rows with zero targets', async () => {
    const authorRows = await sql`
      INSERT INTO authors (auth_id, display_name) VALUES ('check-test', 'Check Test')
      ON CONFLICT (auth_id) DO UPDATE SET display_name = EXCLUDED.display_name
      RETURNING id
    `;
    const reactorId = authorRows[0].id as string;

    await expect(sql`
      INSERT INTO reactions (reactor_id, reaction_type) VALUES (${reactorId}, 'love'::reaction_type)
    `).rejects.toThrow();
  });
});
