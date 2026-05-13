-- Evidence attachments storage bucket
-- Path convention: {org_id}/{thread_id}/{message_id}/{filename}
-- Org-scoped RLS (consistent with equipment-documents pattern)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence-attachments',
  'evidence-attachments',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- SELECT: org members can read their org's attachments
CREATE POLICY "evidence_att_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'evidence-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

-- INSERT: org members can upload to their org's folder
CREATE POLICY "evidence_att_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'evidence-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

-- No UPDATE or DELETE policies (immutable — Proof framing)
