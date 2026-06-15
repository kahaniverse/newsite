-- ============================================================
-- Kahaniverse — Author tiers
-- A progression earned through contribution:
--   reader  → new author, has only read
--   writer  → has added at least one page
--   author  → has started at least one story (creator contributor)
--   creator → has created at least one universe (highest, this phase)
-- Tier is monotonic — it only ever increases. Promotion happens in
-- the create query helpers via promoteTier() (lib/db/queries/authors.ts),
-- wired into createPage / createStory / createUniverse.
-- Apply via: npm run db:migrate  (idempotent — CREATE TYPE is skipped on
-- "already exists"; the column add and backfill are safe to re-run).
-- ============================================================

-- Ordered enum: declaration order defines comparison order, so
-- 'reader' < 'writer' < 'author' < 'creator'. promoteTier and the backfill
-- below rely on this ordering to never demote an author.
CREATE TYPE author_tier AS ENUM ('reader', 'writer', 'author', 'creator');

ALTER TABLE authors ADD COLUMN IF NOT EXISTS tier author_tier NOT NULL DEFAULT 'reader';

-- Backfill / repair from existing content. Derives the highest tier each
-- author has earned from real rows and never lowers their current tier
-- (GREATEST), so re-running keeps tiers consistent with the data.
UPDATE authors a SET tier = GREATEST(
  a.tier,
  CASE
    WHEN EXISTS (SELECT 1 FROM universes u WHERE u.creator_id = a.id)
      THEN 'creator'::author_tier
    WHEN EXISTS (SELECT 1 FROM story_contributors sc WHERE sc.author_id = a.id AND sc.role = 'creator')
      THEN 'author'::author_tier
    WHEN EXISTS (SELECT 1 FROM pages p WHERE p.author_id = a.id)
      THEN 'writer'::author_tier
    ELSE 'reader'::author_tier
  END
);
