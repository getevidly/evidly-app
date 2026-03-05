-- ══════════════════════════════════════════════════════════════════════
-- VENDOR DOCUMENT RLS FIX — Vendor-ID Scoping
-- Migration: 20260304040000
-- AUDIT: vendor_documents RLS was organization-scoped only. Any user in
-- the org could query ALL vendor documents. If a vendor-portal user
-- authenticates via Supabase, they could see other vendors' documents.
-- FIX: Add linked_vendor_id to user_profiles. Replace vendor_documents
-- SELECT/INSERT/UPDATE policies with vendor-scoping for vendor users.
-- Internal org users retain full org-scoped access.
-- NOTE: vendor_documents table may not exist yet (created in 20260407).
-- Steps 2-5 are guarded with IF EXISTS and run only if table is present.
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


-- ── Steps 2-5: vendor_documents and vendor_document_notifications policies ──
-- Only run if vendor_documents table exists (may be created in a later migration)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'vendor_documents'
  ) THEN
    -- Step 2: Replace vendor_documents SELECT policy
    EXECUTE 'DROP POLICY IF EXISTS vendor_documents_org_select ON vendor_documents';
    EXECUTE '
      CREATE POLICY vendor_documents_org_select ON vendor_documents
        FOR SELECT USING (
          (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND organization_id = vendor_documents.organization_id
              AND linked_vendor_id IS NULL
          ))
          OR
          (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND linked_vendor_id = vendor_documents.vendor_id
          ))
          OR
          (auth.role() = ''service_role'')
        )';

    -- Step 3: Replace vendor_documents INSERT policy
    EXECUTE 'DROP POLICY IF EXISTS vendor_documents_org_insert ON vendor_documents';
    EXECUTE '
      CREATE POLICY vendor_documents_org_insert ON vendor_documents
        FOR INSERT WITH CHECK (
          (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND organization_id = vendor_documents.organization_id
              AND linked_vendor_id IS NULL
          ))
          OR
          (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND linked_vendor_id = vendor_documents.vendor_id
          ))
          OR
          (auth.role() = ''service_role'')
        )';

    -- Step 4: Replace vendor_documents UPDATE policy
    EXECUTE 'DROP POLICY IF EXISTS vendor_documents_org_update ON vendor_documents';
    EXECUTE '
      CREATE POLICY vendor_documents_org_update ON vendor_documents
        FOR UPDATE USING (
          (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND organization_id = vendor_documents.organization_id
              AND linked_vendor_id IS NULL
          ))
          OR
          (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND linked_vendor_id = vendor_documents.vendor_id
          ))
          OR
          (auth.role() = ''service_role'')
        )';

    RAISE NOTICE 'Updated vendor_documents RLS policies with vendor scoping';
  ELSE
    RAISE NOTICE 'vendor_documents table does not exist yet — skipping policy updates';
  END IF;

  -- Step 5: Fix vendor_document_notifications SELECT
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'vendor_document_notifications'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS vendor_doc_notifications_org_select ON vendor_document_notifications';
    EXECUTE 'DROP POLICY IF EXISTS vendor_document_notifications_select ON vendor_document_notifications';
    EXECUTE '
      CREATE POLICY vendor_doc_notifications_vendor_scoped ON vendor_document_notifications
        FOR SELECT USING (
          (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND organization_id = vendor_document_notifications.organization_id
              AND linked_vendor_id IS NULL
          ))
          OR
          (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND linked_vendor_id = vendor_document_notifications.vendor_id
          ))
          OR
          (auth.role() = ''service_role'')
        )';
    RAISE NOTICE 'Updated vendor_document_notifications RLS with vendor scoping';
  ELSE
    RAISE NOTICE 'vendor_document_notifications table does not exist yet — skipping';
  END IF;
END $$;
