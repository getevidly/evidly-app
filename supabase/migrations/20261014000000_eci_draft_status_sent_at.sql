-- ============================================================
-- EVIDLY_CLIENT_INVITES — draft status + sent_at column
-- ============================================================
-- Decouples provisioning from invite sending.
--
-- New column: sent_at (null = never sent)
-- New status: 'draft' (provisioned, email not yet sent)
-- expires_at made nullable (drafts have no expiry until sent)
--
-- Backfill: all existing invites treated as "sent at creation"
-- ============================================================

-- 1. Add sent_at column
ALTER TABLE evidly_client_invites
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- 2. Make expires_at nullable (drafts have no expiry until sent)
ALTER TABLE evidly_client_invites
  ALTER COLUMN expires_at DROP NOT NULL;

-- 3. Widen status CHECK to include 'draft'
ALTER TABLE evidly_client_invites
  DROP CONSTRAINT IF EXISTS evidly_client_invites_status_check;

ALTER TABLE evidly_client_invites
  ADD CONSTRAINT evidly_client_invites_status_check
  CHECK (status IN ('draft', 'pending', 'accepted', 'expired', 'revoked'));

-- 4. Backfill: all existing invites were sent at creation time
UPDATE evidly_client_invites
SET sent_at = created_at
WHERE sent_at IS NULL
  AND status IN ('pending', 'accepted', 'expired');
