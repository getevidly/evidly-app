-- Migration: Create capture-artifacts Storage bucket with org+location RLS
-- Why: Pairs with commit 7's capture_artifacts table. The table stores
--      metadata; this bucket stores the actual binary content (photos, audio,
--      OCR images, probe payloads, IoT webhook bodies, transcripts).
-- Bucket config:
--   id/name: 'capture-artifacts' (matches capture_artifacts.storage_bucket default)
--   public: false (signed URLs only, auth required)
--   file_size_limit: 50 MB (52428800 bytes)
--   allowed_mime_types: NULL (open — artifact_type enum is the classifier)
--   avif_autodetection: false
-- RLS pattern:
--   Path convention: {organization_id}/{location_id}/{artifact_type}/{uuid}-{filename}
--   Location_id is path segment [2] via storage.foldername(name) (1-indexed)
--   3 policies: SELECT, INSERT, DELETE — all location-scoped via user_location_access
--   No UPDATE policy — artifacts are immutable once written (audit immutability
--   per SOP rule 5.3, matching capture_artifacts table policy from commit 7)
-- Note on pattern vs existing buckets:
--   Existing 10 buckets use simple bucket_id-only ALL-operations policies.
--   This bucket uses per-operation policies with path-based location scoping —
--   intentionally stricter because capture artifacts tie to specific
--   location-scoped reading rows.
-- Cross-references:
--   - Phase 1 Schema Sprint commit 7 (capture_artifacts metadata table)
-- This is the FINAL commit of the Phase 1 Schema Sprint.

-- ── Create the capture-artifacts Storage bucket ──────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, avif_autodetection)
VALUES ('capture-artifacts', 'capture-artifacts', false, 52428800, false)
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS policies on storage.objects ──────────────────────────
-- Path convention: {organization_id}/{location_id}/{artifact_type}/{uuid}-{filename}
-- location_id is the 2nd path segment: (storage.foldername(name))[2]

-- SELECT: read access for users with location access
CREATE POLICY capture_artifacts_storage_select
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'capture-artifacts'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: upload access for users with location access
CREATE POLICY capture_artifacts_storage_insert
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'capture-artifacts'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );

-- DELETE: delete access for users with location access
CREATE POLICY capture_artifacts_storage_delete
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'capture-artifacts'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT location_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  );

-- NOTE: No UPDATE policy. Artifacts are immutable once written.
-- Audit immutability per SOP rule 5.3.
