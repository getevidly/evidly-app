-- ============================================================
-- Storage Buckets — Create all buckets used by the codebase
-- ============================================================

-- 1. vault — Admin document vault (internal docs, contracts, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault',
  'vault',
  false,
  52428800,  -- 50 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. compliance-photos — Checklist and compliance photo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-photos',
  'compliance-photos',
  false,
  10485760,  -- 10 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 3. documents — Tenant document uploads (scanned by document-scan edge function)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,  -- 50 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 4. reports — Generated compliance report PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false,
  26214400,  -- 25 MB
  ARRAY[
    'application/pdf',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 5. uploads — General file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;


-- ── RLS POLICIES ──────────────────────────────────────────────
-- Drop any existing policies to avoid conflicts on re-run
DO $$ BEGIN
  DROP POLICY IF EXISTS "vault_upload" ON storage.objects;
  DROP POLICY IF EXISTS "vault_read" ON storage.objects;
  DROP POLICY IF EXISTS "vault_delete" ON storage.objects;
  DROP POLICY IF EXISTS "vault_all" ON storage.objects;
  DROP POLICY IF EXISTS "photos_upload" ON storage.objects;
  DROP POLICY IF EXISTS "photos_read" ON storage.objects;
  DROP POLICY IF EXISTS "compliance_photos_all" ON storage.objects;
  DROP POLICY IF EXISTS "documents_upload" ON storage.objects;
  DROP POLICY IF EXISTS "documents_read" ON storage.objects;
  DROP POLICY IF EXISTS "documents_delete" ON storage.objects;
  DROP POLICY IF EXISTS "documents_insert" ON storage.objects;
  DROP POLICY IF EXISTS "documents_select" ON storage.objects;
  DROP POLICY IF EXISTS "reports_read" ON storage.objects;
  DROP POLICY IF EXISTS "reports_service_write" ON storage.objects;
  DROP POLICY IF EXISTS "reports_all" ON storage.objects;
  DROP POLICY IF EXISTS "uploads_all" ON storage.objects;
  DROP POLICY IF EXISTS "auth_upload_documents" ON storage.objects;
  DROP POLICY IF EXISTS "auth_read_documents" ON storage.objects;
  DROP POLICY IF EXISTS "auth_upload_uploads" ON storage.objects;
  DROP POLICY IF EXISTS "auth_read_uploads" ON storage.objects;
  DROP POLICY IF EXISTS "admin_all_vault" ON storage.objects;
END $$;

-- Vault — all authenticated users (admin guards in app layer)
CREATE POLICY "vault_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'vault')
  WITH CHECK (bucket_id = 'vault');

-- Compliance photos — all authenticated users
CREATE POLICY "compliance_photos_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'compliance-photos')
  WITH CHECK (bucket_id = 'compliance-photos');

-- Documents — all authenticated users
CREATE POLICY "documents_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

-- Reports — all authenticated users
CREATE POLICY "reports_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'reports')
  WITH CHECK (bucket_id = 'reports');

-- Uploads — all authenticated users
CREATE POLICY "uploads_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'uploads')
  WITH CHECK (bucket_id = 'uploads');
