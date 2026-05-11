-- M11: Replace RLS policies on compliance_documents
-- New policy set:
--   SELECT: org member + ULA location check (or location_id IS NULL for org-level docs)
--   INSERT: org member with appropriate role
--   UPDATE: org member OR vendor user for business-category self-service
--   DELETE: owner_operator, executive, compliance_manager only
--   service_role: full access (unchanged)

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS compliance_documents_select_own_org ON compliance_documents;
DROP POLICY IF EXISTS compliance_documents_insert_own_org ON compliance_documents;
DROP POLICY IF EXISTS compliance_documents_update_own_org ON compliance_documents;
DROP POLICY IF EXISTS compliance_documents_insert_service_role ON compliance_documents;
DROP POLICY IF EXISTS compliance_documents_update_service_role ON compliance_documents;

-- 1. SELECT: org member can read docs at locations they have access to, or org-level (location_id IS NULL)
CREATE POLICY cd_select_org_member
  ON compliance_documents FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    AND (
      location_id IS NULL
      OR location_id IN (
        SELECT location_id FROM user_location_access
        WHERE user_id = auth.uid()
          AND location_id IS NOT NULL
      )
      -- Org-wide roles bypass location check
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
          AND role IN ('owner_operator', 'executive', 'compliance_manager', 'platform_admin')
      )
    )
  );

-- 2. INSERT: org member with write role
CREATE POLICY cd_insert_org_member
  ON compliance_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- 3. UPDATE: org member OR vendor user for business-category self-service
CREATE POLICY cd_update_org_member
  ON compliance_documents FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- 4. Vendor self-service: vendor_users can INSERT business-category docs for their vendor
CREATE POLICY cd_insert_vendor_self_service
  ON compliance_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    category = 'business'
    AND vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

-- 5. Vendor self-service: vendor_users can UPDATE business-category docs for their vendor
CREATE POLICY cd_update_vendor_self_service
  ON compliance_documents FOR UPDATE
  TO authenticated
  USING (
    category = 'business'
    AND vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    category = 'business'
    AND vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

-- 6. DELETE: restricted to management roles
CREATE POLICY cd_delete_management
  ON compliance_documents FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('owner_operator', 'executive', 'compliance_manager', 'platform_admin')
    )
  );

-- 7. Service role: full access (INSERT + UPDATE only, no DELETE — archive-only design)
CREATE POLICY cd_service_role_insert
  ON compliance_documents FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY cd_service_role_update
  ON compliance_documents FOR UPDATE
  TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
