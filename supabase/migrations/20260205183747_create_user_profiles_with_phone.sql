/*
  # Create User Profiles Table

  1. New Table
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text, required)
      - `phone` (varchar(20), optional)
      - `organization_id` (uuid, references organizations)
      - `avatar_url` (text, nullable)
      - `role` (varchar, default 'member')
      - `points` (integer, default 0)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
  
  2. Security
    - Enable RLS on user_profiles table
    - Users can view profiles in their organization
    - Users can update their own profile
    - Users can insert their own profile
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone varchar(20),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  avatar_url text,
  role varchar(50) DEFAULT 'member',
  points integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles in their organization"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization_id);