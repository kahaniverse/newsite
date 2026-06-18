-- ============================================================
-- Kahaniverse — Anonymity & content-filter
-- Makes the "secure anonymous storytelling network" claim structural:
--   • no DOB / age stored at rest
--   • optional email-less (recovery-code) accounts
--   • a Kid/Grown-up content filter that authors drive by self-rating
-- Apply via: npm run db:migrate (idempotent — IF EXISTS / IF NOT EXISTS).
-- ============================================================

-- 1) Drop DOB. We no longer collect any age or PII. Age is a client-side
--    content filter (the Kid/Grown-up persona), never a stored attribute —
--    so a breach can't reveal what was never gathered.
ALTER TABLE authors DROP COLUMN IF EXISTS dob;

-- 2) Recovery-code accounts: passwordless and email-less. We store ONLY a
--    SHA-256 hash of a one-time recovery code; the code itself is shown once
--    and never persisted. A dump yields hashes, not credentials. The partial
--    unique index treats NULL as absent, so OAuth/email users (no code) are
--    unaffected.
ALTER TABLE authors ADD COLUMN IF NOT EXISTS recovery_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_authors_recovery_hash
  ON authors(recovery_hash) WHERE recovery_hash IS NOT NULL;

-- 3) Content rating for the Kid/Grown-up filter. Authors self-rate; the safe
--    default (false) means existing content stays visible to everyone. The Kid
--    persona sees only is_mature = false.
ALTER TABLE universes ADD COLUMN IF NOT EXISTS is_mature BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE stories   ADD COLUMN IF NOT EXISTS is_mature BOOLEAN NOT NULL DEFAULT false;
