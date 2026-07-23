-- Add viewed_at to invite tables — tracks when a prospect first opens the link.
-- Additive only, no drops.

ALTER TABLE evidly_client_invites
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;

ALTER TABLE user_invitations
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;
