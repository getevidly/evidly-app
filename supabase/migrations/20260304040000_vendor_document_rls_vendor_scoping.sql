-- ══════════════════════════════════════════════════════════════════════
-- VENDOR DOCUMENT RLS FIX — Vendor-ID Scoping
-- Migration: 20260304040000
-- AUDIT: vendor_documents RLS was organization-scoped only. Any user in
-- the org could query ALL vendor documents. If a vendor-portal user
-- authenticates via Supabase, they could see other vendors' documents.
-- FIX: Add linked_vendor_id to user_profiles. Replace vendor_documents
-- SELECT/INSERT/UPDATE policies with vendor-scoping for vendor users.
-- Internal org users retain full org-scoped access.
-- ══════════════════════════════════════════════════════════════════════

-- ── Step 1: Add linked_vendor_id to user_profiles ─────────────────
-- Populated when a vendor user signs up via VendorRegister / vendor portal.
-- NULL for internal org users (owner, compliance_manager, etc.).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'linked_vendor_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN linked_vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;
    CREATE INDEX idx_user_profiles_linked_vendor ON user_profiles(linked_vendor_id) WHERE linked_vendor_id IS NOT NULL;
    RAISE NOTICE 'Added linked_vendor_id to user_profiles';
  END IF;
END $$;


-- ── Step 2: Replace vendor_documents SELECT policy ────────────────
-- Internal org users (linked_vendor_id IS NULL): org-scoped access (unchanged)
-- Vendor-portal users (linked_vendor_id IS NOT NULL): restricted to own vendor_id
DROP POLICY IF EXISTS vendor_documents_org_select ON vendor_documents;

CREATE POLICY vendor_documents_org_select ON vendor_documents
  FOR SELECT USING (
    -- Internal org users: full org access
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
          AND organization_id = vendor_documents.organization_id
          AND linked_vendor_id IS NULL
      )
    )
    OR
    -- Vendor-portal users: only their own vendor docs
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
          AND linked_vendor_id = vendor_documents.vendor_id
      )
    )
    OR
    -- Service role bypass
    (auth.role() = 'service_role')
  );


-- ── Step 3: Replace vendor_documents INSERT policy ────────────────
DROP POLICY IF EXISTS vendor_documents_org_insert ON vendor_documents;

CREATE POLICY vendor_documents_org_insert ON vendor_documents
  FOR INSERT WITH CHECK (
    -- Internal org users
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
          AND organization_id = vendor_documents.organization_id
          AND linked_vendor_id IS NULL
      )
    )
    OR
    -- Vendor users: only insert for their own vendor_id
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
          AND linked_vendor_id = vendor_documents.vendor_id
      )
    )
    OR
    (auth.role() = 'service_role')
  );


-- ── Step 4: Replace vendor_documents UPDATE policy ────────────────
DROP POLICY IF EXISTS vendor_documents_org_update ON vendor_documents;

CREATE POLICY vendor_documents_org_update ON vendor_documents
  FOR UPDATE USING (
    -- Internal org users
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
          AND organization_id = vendor_documents.organization_id
          AND linked_vendor_id IS NULL
      )
    )
    OR
    -- Vendor users: only update their own docs
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
          AND linked_vendor_id = vendor_documents.vendor_id
      )
    )
    OR
    (auth.role() = 'service_role')
  );


-- ── Step 5: Fix vendor_document_notifications SELECT ──────────────
-- Vendor users should only see notifications for their own vendor docs
DROP POLICY IF EXISTS vendor_doc_notifications_org_select ON vendor_document_notifications;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_document_notifications' AND policyname = 'vendor_doc_notifications_org_select'
  ) THEN
    RAISE NOTICE 'Policy already replaced';
  ELSE
    -- Try dropping any existing policy name variants
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS vendor_document_notifications_select ON vendor_document_notifications';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

CREATE POLICY vendor_doc_notifications_vendor_scoped ON vendor_document_notifications
  FOR SELECT USING (
    -- Internal org users: full org access
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
          AND organization_id = vendor_document_notifications.organization_id
          AND linked_vendor_id IS NULL
      )
    )
    OR
    -- Vendor users: only their own vendor notifications
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
          AND linked_vendor_id = vendor_document_notifications.vendor_id
      )
    )
    OR
    (auth.role() = 'service_role')
  );

-- ══════════════════════════════════════════════════════════════════════
-- VERIFICATION: After running, confirm with:
--   SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'vendor_documents';
--   SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'vendor_document_notifications';
-- ══════════════════════════════════════════════════════════════════════
