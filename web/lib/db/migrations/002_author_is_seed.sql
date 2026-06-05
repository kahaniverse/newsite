-- ============================================================
-- Kahaniverse — Author seed flag
-- Marks automated / dummy "seed" authors so the content they
-- generate (universes, stories, pages, characters) can be
-- cleaned up later via `npm run db:cleanup-seed`.
-- Apply via: npm run db:migrate  (idempotent)
-- ============================================================

-- The flag itself. Real (human) authors stay false; seeded /
-- automated accounts are true. Never exposed in API responses
-- (rowToAuthor in lib/db/queries/authors.ts does not map it).
ALTER TABLE authors ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;

-- Partial index: cleanup queries only ever filter on is_seed = true.
CREATE INDEX IF NOT EXISTS idx_authors_is_seed ON authors(is_seed) WHERE is_seed;

-- Backfill: existing seeded data uses reserved auth_id prefixes
-- ('system:kahaniverse', 'seed:<slug>'). Mark those retroactively.
UPDATE authors SET is_seed = true
WHERE is_seed = false
  AND (auth_id LIKE 'seed:%' OR auth_id LIKE 'system:%');
