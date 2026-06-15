-- ============================================================
-- Kahaniverse — Email verification (soft)
-- Credential (email/password) signups now receive a confirmation
-- email with a verify link. Verification is SOFT: accounts are
-- created with email_verified = false and may sign in immediately;
-- clicking the link flips the flag to true. (See PRD.md:78.)
--
-- Apply via: npm run db:migrate  (idempotent — ADD COLUMN IF NOT
-- EXISTS, and the backfill only ever sets true so re-running is safe.)
-- ============================================================

ALTER TABLE authors ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- OAuth/OIDC providers (Google, Twitter, Instagram) and the system/seed
-- author already have a provider-verified identity — there is no email link
-- to click — so treat every non-credential account as verified. Only
-- `email:<addr>` auth_ids represent credential signups that must confirm.
UPDATE authors SET email_verified = true WHERE auth_id NOT LIKE 'email:%';
