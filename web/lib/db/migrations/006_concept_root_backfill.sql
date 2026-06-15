-- 006: Backfill the page-0 "concept" root for pre-existing stories.
--
-- Stories created before the concept model have a *real* first page as their
-- root (numbered page 1), instead of a structural concept anchor (page 0). That
-- makes every authored page read one level too shallow — the first continuation
-- shows "Beginnings" instead of "Page 2", and so on.
--
-- Fix: insert a concept anchor above each legacy root and re-parent the old root
-- under it. The old first page becomes page 1 (a Beginning); its children become
-- page 2; numbering is consistent with newly authored stories.
--
-- Idempotent: only roots whose content is NOT already the concept marker are
-- migrated. After a run, every story's root is a concept (marker content), so a
-- re-run is a no-op. The concept marker MUST match STORY_CONCEPT_CONTENT in
-- lib/db/queries/pages.ts.
--
-- The single-root partial unique index is dropped for the duration because the
-- backfill briefly holds two NULL-parent rows per story (the migration runner
-- autocommits each statement, so this can't be wrapped in one transaction). It
-- is recreated at the end; each story ends with exactly one concept root.

DROP INDEX IF EXISTS idx_pages_root_per_story;

WITH old_roots AS (
  SELECT id, story_id, author_id
  FROM pages
  WHERE parent_id IS NULL
    AND content <> '(Story concept — add pages to begin this story.)'
),
new_concepts AS (
  INSERT INTO pages (story_id, parent_id, content, author_id)
  SELECT story_id, NULL, '(Story concept — add pages to begin this story.)', author_id
  FROM old_roots
  RETURNING id, story_id
)
UPDATE pages p
SET parent_id = nc.id
FROM new_concepts nc
WHERE p.story_id = nc.story_id
  AND p.id IN (SELECT id FROM old_roots);

CREATE UNIQUE INDEX idx_pages_root_per_story ON pages(story_id) WHERE parent_id IS NULL;
