-- ============================================================================
-- Storage Bucket RLS Lockdown
-- Replaces 7 wide-open ALL policies with org-scoped policies per bucket.
-- Pattern: (storage.foldername(name))[1] must match user's organization_id.
-- Service-role retains unrestricted access for edge functions.
-- ============================================================================

BEGIN;

-- ─── 1. DROP old wide-open policies ─────────────────────────────────────────

DROP POLICY IF EXISTS "vault_all" ON storage.objects;
DROP POLICY IF EXISTS "documents_all" ON storage.objects;
DROP POLICY IF EXISTS "uploads_all" ON storage.objects;
DROP POLICY IF EXISTS "compliance_docs_all" ON storage.objects;
DROP POLICY IF EXISTS "compliance_photos_all" ON storage.objects;
DROP POLICY IF EXISTS "vendor_docs_all" ON storage.objects;
DROP POLICY IF EXISTS "vendor_uploads_all" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can upload files" ON storage.objects;

-- ─── 2. vault ────────────────────────────────────────────────────────────────

CREATE POLICY "vault_org_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'vault'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "vault_org_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'vault'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "vault_org_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'vault'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "vault_org_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'vault'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "vault_service_role" ON storage.objects FOR ALL USING (
  bucket_id = 'vault' AND auth.role() = 'service_role'
);

-- ─── 3. documents ────────────────────────────────────────────────────────────

CREATE POLICY "documents_org_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "documents_org_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "documents_org_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "documents_org_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "documents_service_role" ON storage.objects FOR ALL USING (
  bucket_id = 'documents' AND auth.role() = 'service_role'
);

-- ─── 4. uploads ──────────────────────────────────────────────────────────────

CREATE POLICY "uploads_org_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "uploads_org_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "uploads_org_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "uploads_org_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "uploads_service_role" ON storage.objects FOR ALL USING (
  bucket_id = 'uploads' AND auth.role() = 'service_role'
);

-- ─── 5. compliance-documents ─────────────────────────────────────────────────

CREATE POLICY "compliance_documents_org_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "compliance_documents_org_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "compliance_documents_org_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "compliance_documents_org_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "compliance_documents_service_role" ON storage.objects FOR ALL USING (
  bucket_id = 'compliance-documents' AND auth.role() = 'service_role'
);

-- ─── 6. compliance-photos ────────────────────────────────────────────────────

CREATE POLICY "compliance_photos_org_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'compliance-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "compliance_photos_org_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'compliance-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "compliance_photos_org_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'compliance-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "compliance_photos_org_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'compliance-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "compliance_photos_service_role" ON storage.objects FOR ALL USING (
  bucket_id = 'compliance-photos' AND auth.role() = 'service_role'
);

-- ─── 7. vendor-documents ─────────────────────────────────────────────────────

CREATE POLICY "vendor_documents_org_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'vendor-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "vendor_documents_org_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'vendor-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "vendor_documents_org_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'vendor-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "vendor_documents_org_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'vendor-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "vendor_documents_service_role" ON storage.objects FOR ALL USING (
  bucket_id = 'vendor-documents' AND auth.role() = 'service_role'
);

-- ─── 8. vendor-uploads ───────────────────────────────────────────────────────

CREATE POLICY "vendor_uploads_org_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'vendor-uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "vendor_uploads_org_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'vendor-uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "vendor_uploads_org_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'vendor-uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "vendor_uploads_org_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'vendor-uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "vendor_uploads_service_role" ON storage.objects FOR ALL USING (
  bucket_id = 'vendor-uploads' AND auth.role() = 'service_role'
);

COMMIT;
