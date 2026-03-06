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

-- 4. reports — Generated compliance report PDFs (public read for signed URLs)
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


-- ── RLS POLICIES ──────────────────────────────────────────────

-- vault: admin-only (EvidLY staff)
CREATE POLICY "vault_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vault'
    AND auth.jwt() ->> 'email' LIKE '%@getevidly.com'
  );

CREATE POLICY "vault_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'vault'
    AND auth.jwt() ->> 'email' LIKE '%@getevidly.com'
  );

CREATE POLICY "vault_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vault'
    AND auth.jwt() ->> 'email' LIKE '%@getevidly.com'
  );

-- compliance-photos: any authenticated user can upload/read
CREATE POLICY "photos_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'compliance-photos');

CREATE POLICY "photos_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'compliance-photos');

-- documents: any authenticated user can upload/read
CREATE POLICY "documents_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "documents_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "documents_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents');

-- reports: any authenticated user can read; service_role writes
CREATE POLICY "reports_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'reports');

CREATE POLICY "reports_service_write" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reports'
    AND (auth.jwt() ->> 'email' LIKE '%@getevidly.com' OR auth.role() = 'service_role')
  );
