-- user_profiles.status — canonical user state column
-- Replaces ad-hoc reads of is_suspended / locked_until for display.
-- Backfills existing rows; new profiles default to 'active'.

-- A. status column
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add CHECK constraint separately (IF NOT EXISTS not supported for constraints,
-- so use DO block to check first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_status_check'
      AND conrelid = 'user_profiles'::regclass
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_status_check
      CHECK (status IN ('invited', 'active', 'suspended', 'locked'));
  END IF;
END $$;

-- B. Backfill from existing flags
UPDATE user_profiles SET status = 'suspended'
  WHERE is_suspended = true AND status = 'active';

UPDATE user_profiles SET status = 'locked'
  WHERE locked_until IS NOT NULL
    AND locked_until > now()
    AND is_suspended IS NOT true
    AND status = 'active';

-- C. Track email column (already exists at runtime, IF NOT EXISTS is safe)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email text;

-- D. Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email  ON user_profiles(lower(email));

-- E. Platform admin can read invites (for Send Reminder in AdminUsers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'platform_admin_read_invites'
      AND tablename = 'evidly_client_invites'
  ) THEN
    CREATE POLICY "platform_admin_read_invites"
      ON evidly_client_invites FOR SELECT
      TO authenticated
      USING ( public.is_platform_admin() );
  END IF;
END $$;
