/*
  # Create Core Organization and Location Tables
  
  1. New Tables
    - `organizations` - Main organization/company entity
    - `locations` - Physical locations belonging to organizations
    - `user_location_access` - Access control linking users to orgs/locations
  
  2. Security
    - RLS enabled on all tables
    - Policies ensure users can only access their organization's data
  
  3. Notes
    - Industry type and subtype support compliance scoring customization
    - Compliance weights (operational, equipment, documentation) total 100%
    - These weights determine how compliance scores are calculated per org
*/

-- Create organizations table first (no dependencies)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry_type varchar(100),
  industry_subtype varchar(100),
  operational_weight integer DEFAULT 45,
  equipment_weight integer DEFAULT 30,
  documentation_weight integer DEFAULT 25,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create locations table (depends on organizations)
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city varchar(100),
  state varchar(50),
  zip varchar(20),
  phone varchar(20),
  status varchar(50) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_location_access table (depends on both)
CREATE TABLE IF NOT EXISTS user_location_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  role varchar(50) DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, organization_id, location_id)
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_location_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for locations
CREATE POLICY "Users can view locations in their organization"
  ON locations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert locations in their organization"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update locations in their organization"
  ON locations FOR UPDATE
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

CREATE POLICY "Users can delete locations in their organization"
  ON locations FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for user_location_access
CREATE POLICY "Users can view their own access"
  ON user_location_access FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_locations_org ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_location_access_user ON user_location_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_access_org ON user_location_access(organization_id);
