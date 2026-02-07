/*
  # Add Location Count and Vendor Support
  
  1. Changes to Organizations
    - Add planned_location_count for signup flow
    - Add subscription_status and stripe_customer_id for billing
  
  2. New Vendor Tables
    - vendors - Vendor company information
    - vendor_users - Individual users at vendor companies  
    - vendor_client_relationships - Links vendors to restaurant clients
    - vendor_upload_requests - Tracks document upload requests
  
  3. Security
    - RLS enabled on all tables with proper policies
*/

-- Add columns to organizations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'planned_location_count'
  ) THEN
    ALTER TABLE organizations ADD COLUMN planned_location_count integer DEFAULT 1;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE organizations ADD COLUMN subscription_status varchar(50) DEFAULT 'trial';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN stripe_customer_id varchar(255);
  END IF;
END $$;

-- Vendor Companies Table
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  service_type varchar(100) NOT NULL,
  contact_name text,
  email text UNIQUE NOT NULL,
  phone varchar(20),
  status varchar(50) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vendor Users Table
CREATE TABLE IF NOT EXISTS vendor_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  role varchar(50) DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, vendor_id)
);

-- Vendor-Client Relationships Table
CREATE TABLE IF NOT EXISTS vendor_client_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status varchar(50) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id, organization_id)
);

-- Vendor Upload Requests Table (document_id without FK constraint)
CREATE TABLE IF NOT EXISTS vendor_upload_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  request_type varchar(100) NOT NULL,
  description text,
  status varchar(50) DEFAULT 'pending',
  requested_by uuid,
  completed_by uuid,
  completed_at timestamptz,
  document_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_client_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_upload_requests ENABLE ROW LEVEL SECURITY;

-- Vendors RLS Policies
CREATE POLICY "Vendors can view their own company"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update their own company"
  ON vendors FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

-- Vendor Users RLS Policies
CREATE POLICY "Vendor users can view their associations"
  ON vendor_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Vendor Client Relationships RLS Policies
CREATE POLICY "Vendors can view their clients"
  ON vendor_client_relationships FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view their vendors"
  ON vendor_client_relationships FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Vendor Upload Requests RLS Policies
CREATE POLICY "Vendors can view their upload requests"
  ON vendor_upload_requests FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update their upload requests"
  ON vendor_upload_requests FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organizations can view their requests"
  ON vendor_upload_requests FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organizations can create upload requests"
  ON vendor_upload_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);
CREATE INDEX IF NOT EXISTS idx_vendor_users_user ON vendor_users(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_users_vendor ON vendor_users(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_clients_vendor ON vendor_client_relationships(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_clients_org ON vendor_client_relationships(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_uploads_vendor ON vendor_upload_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_uploads_org ON vendor_upload_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_uploads_status ON vendor_upload_requests(status);
