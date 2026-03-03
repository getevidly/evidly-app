-- =====================================================
-- Vendor Marketplace Enhancements
-- =====================================================
-- Adds invite/approval workflow, review sources (Google,
-- Yelp, EvidLY), and marketplace_documents table.
-- =====================================================

-- 1. Add status + invite tracking to marketplace_vendors
ALTER TABLE marketplace_vendors
  ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS invited_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_by_org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mp_vendors_status ON marketplace_vendors(status);

-- 2. Add review source to marketplace_reviews
ALTER TABLE marketplace_reviews
  ADD COLUMN IF NOT EXISTS source varchar(20) DEFAULT 'evidly'
    CHECK (source IN ('google', 'yelp', 'evidly')),
  ADD COLUMN IF NOT EXISTS reviewer_org_name text;

-- 3. marketplace_documents — vendor document uploads
CREATE TABLE IF NOT EXISTS marketplace_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_vendor_id uuid NOT NULL REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
  document_type varchar(100) NOT NULL,
  file_name text NOT NULL,
  file_url text,
  file_size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expiration_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mp_documents_vendor ON marketplace_documents(marketplace_vendor_id);
CREATE INDEX IF NOT EXISTS idx_mp_documents_type ON marketplace_documents(document_type);

-- 4. RLS for marketplace_documents
ALTER TABLE marketplace_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read marketplace documents"
  ON marketplace_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upload marketplace documents"
  ON marketplace_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Admin write policies for marketplace_vendors (invite + approve)
-- Allow authenticated users to insert new vendor invitations
CREATE POLICY "Authenticated users can invite vendors"
  ON marketplace_vendors FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow admins (owner/executive/platform_admin) to update vendor status
CREATE POLICY "Admins can update marketplace vendors"
  ON marketplace_vendors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'owner_operator', 'admin', 'executive', 'platform_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'owner_operator', 'admin', 'executive', 'platform_admin')
    )
  );

-- Allow reading pending vendors for admin approval queue
CREATE POLICY "Admins can read pending marketplace vendors"
  ON marketplace_vendors FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'owner_operator', 'admin', 'executive', 'platform_admin')
    )
  );
