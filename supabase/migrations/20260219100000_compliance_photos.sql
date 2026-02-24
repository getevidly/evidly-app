-- ============================================================
-- Migration: Compliance Photos
-- Timestamped, geotagged photo evidence for compliance proof
-- ============================================================

-- Storage bucket (manual step — Supabase CLI doesn't support bucket creation via SQL)
-- Run in Supabase dashboard: create bucket "compliance-photos" with public=false

-- ── compliance_photos table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  
  -- What this photo documents
  record_type TEXT NOT NULL CHECK (record_type IN (
    'temp_log', 'checklist', 'incident', 'vendor_delivery',
    'equipment', 'self_audit', 'inspection', 'corrective_action', 'general'
  )),
  record_id UUID,  -- FK to the parent record (temp_logs.id, checklists.id, etc.)
  
  -- Storage
  storage_path TEXT NOT NULL,  -- path in Supabase Storage bucket
  thumbnail_path TEXT,
  file_size_bytes INTEGER,
  mime_type TEXT DEFAULT 'image/jpeg',
  
  -- Metadata captured at time of photo
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  device_info TEXT,  -- e.g. "iPhone 15 Pro, iOS 18"
  
  -- Overlay data burned into image
  overlay_timestamp TEXT,  -- human-readable timestamp burned into photo
  overlay_gps TEXT,        -- GPS coords burned into photo
  
  -- Compliance
  caption TEXT,
  tags TEXT[] DEFAULT '{}',
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  
  -- Audit trail
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ  -- soft delete
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_photos_org ON compliance_photos(organization_id);
CREATE INDEX idx_photos_location ON compliance_photos(location_id);
CREATE INDEX idx_photos_record ON compliance_photos(record_type, record_id);
CREATE INDEX idx_photos_captured ON compliance_photos(captured_at DESC);
CREATE INDEX idx_photos_uploaded_by ON compliance_photos(uploaded_by);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE compliance_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view photos in their org"
  ON compliance_photos FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert photos in their org"
  ON compliance_photos FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers can update photos in their org"
  ON compliance_photos FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      AND role IN ('executive', 'management')
    )
  );

CREATE POLICY "Managers can delete photos in their org"
  ON compliance_photos FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      AND role IN ('executive', 'management')
    )
  );

-- ── Updated-at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_compliance_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compliance_photos_updated_at
  BEFORE UPDATE ON compliance_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_photos_updated_at();

-- ── Storage policies (for the compliance-photos bucket) ─────
-- These would be set in Supabase dashboard or via supabase storage policies
-- INSERT: authenticated users in same org
-- SELECT: authenticated users in same org
-- DELETE: managers in same org
