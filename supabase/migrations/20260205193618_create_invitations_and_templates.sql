/*
  # Add Team Invitations and Onboarding Templates
  
  1. New Tables
    - `user_invitations`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `email` (text, unique per org)
      - `role` (varchar - Admin, Manager, Staff)
      - `invited_by` (uuid, references auth.users)
      - `token` (text, unique for invite link)
      - `status` (varchar - pending, accepted, expired)
      - `expires_at` (timestamptz)
      - `accepted_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
    
    - `onboarding_checklist_items`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `category` (varchar - temperature_logs, checklists, vendor_services, documents)
      - `item_name` (text)
      - `is_enabled` (boolean, default true)
      - `is_required` (boolean, default false)
      - `custom` (boolean, default false)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Admins can manage invitations
    - Users can view checklist items for their org
*/

-- User Invitations Table
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role varchar(50) NOT NULL DEFAULT 'Staff',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, email, status)
);

-- Onboarding Checklist Items Table
CREATE TABLE IF NOT EXISTS onboarding_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  category varchar(50) NOT NULL,
  item_name text NOT NULL,
  is_enabled boolean DEFAULT true,
  is_required boolean DEFAULT false,
  custom boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_checklist_items ENABLE ROW LEVEL SECURITY;

-- Policies for user_invitations
CREATE POLICY "Admins can view invitations for their org"
  ON user_invitations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can create invitations"
  ON user_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can update invitations"
  ON user_invitations FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Policies for onboarding_checklist_items
CREATE POLICY "Users can view checklist items for their org"
  ON onboarding_checklist_items FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create checklist items for their org"
  ON onboarding_checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update checklist items for their org"
  ON onboarding_checklist_items FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_org ON user_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_checklist_org ON onboarding_checklist_items(organization_id);
