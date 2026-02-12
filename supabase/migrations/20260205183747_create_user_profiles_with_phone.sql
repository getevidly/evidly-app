/*
  # Add phone column to user_profiles (if not already present)
*/
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone varchar(20);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization_id);
