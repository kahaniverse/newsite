import { describe, it, expect } from 'vitest';
import { splitStatements } from '@/scripts/migrate';

describe('splitStatements', () => {
  it('splits two simple statements', () => {
    const out = splitStatements(`SELECT 1; SELECT 2;`);
    expect(out).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('preserves semicolons inside $$ … $$ function bodies', () => {
    const ddl = `
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
      CREATE INDEX foo ON bar(baz);
    `;
    const out = splitStatements(ddl);
    expect(out).toHaveLength(2);
    expect(out[0]).toContain('$$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$');
    expect(out[1]).toBe('CREATE INDEX foo ON bar(baz)');
  });

  it('ignores semicolons inside single-quoted strings', () => {
    const ddl = `INSERT INTO t VALUES ('a;b;c'); SELECT 1;`;
    const out = splitStatements(ddl);
    expect(out).toEqual([`INSERT INTO t VALUES ('a;b;c')`, 'SELECT 1']);
  });

  it('handles doubled single-quote escapes', () => {
    const ddl = `INSERT INTO t VALUES ('it''s; fine'); SELECT 1;`;
    const out = splitStatements(ddl);
    expect(out).toHaveLength(2);
    expect(out[0]).toContain(`'it''s; fine'`);
  });

  it('ignores semicolons in -- line comments', () => {
    const ddl = `SELECT 1; -- trailing; comment\nSELECT 2;`;
    const out = splitStatements(ddl);
    // The comment-internal `;` must not trigger a split → exactly 2 statements.
    expect(out).toHaveLength(2);
    expect(out[0]).toBe('SELECT 1');
    expect(out[1]).toContain('SELECT 2');
  });

  it('ignores semicolons in /* block comments */', () => {
    const ddl = `SELECT 1; /* inside; block; */ SELECT 2;`;
    const out = splitStatements(ddl);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe('SELECT 1');
    expect(out[1]).toContain('SELECT 2');
  });

  it('drops empty trailing statements', () => {
    const out = splitStatements(`SELECT 1;\n\n   \n`);
    expect(out).toEqual(['SELECT 1']);
  });
});
