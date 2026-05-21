-- Add parallel FK so PostgREST can resolve embedded joins to user_profiles.full_name
-- user_profiles.id is itself FK'd to auth.users.id, so this is structurally consistent

ALTER TABLE drift_acknowledgments
  ADD CONSTRAINT drift_acknowledgments_user_id_profile_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Apply-time verification block
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'drift_acknowledgments_user_id_profile_fkey'
    AND table_name = 'drift_acknowledgments'
  ) THEN
    RAISE EXCEPTION 'drift_acknowledgments_user_id_profile_fkey constraint missing';
  END IF;
END $$;
