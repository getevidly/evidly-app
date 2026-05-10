-- ═══════════════════════════════════════════════════════════════════════
-- Equipment Module — 4 tables + storage bucket + RLS
--
-- Tables:
--   1. equipment              — inventory of tracked assets
--   2. equipment_service_records — service/cleaning history per item
--   3. equipment_deficiencies — open/resolved deficiency findings
--   4. equipment_documents    — file metadata (actual files in storage)
--
-- Storage:
--   Bucket: equipment-documents (private)
--   Path convention: {organization_id}/{equipment_id}/{filename}
--   RLS on storage.objects scopes reads/writes to org membership
--   via path prefix match.
--
-- Notes:
--   - Original equipment tables (migration 20260222000000) were dropped
--     from PROD manually. This migration recreates from scratch matching
--     the current TypeScript interfaces in src/hooks/api/useEquipment.ts.
--   - RLS pattern matches alerts/incidents: org_id resolved via
--     user_profiles.organization_id WHERE id = auth.uid().
--   - Category uses the locked 3-value set matching incidents/deficiencies.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- TABLE 1: equipment
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  category TEXT NOT NULL CHECK (category IN ('food_safety', 'fire_safety', 'facility_services')),
  name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  manufacturer TEXT DEFAULT '',
  model TEXT DEFAULT '',
  serial_number TEXT DEFAULT '',
  install_date DATE,
  location_name TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  installed_area TEXT DEFAULT '',
  condition TEXT NOT NULL DEFAULT 'clean' CHECK (condition IN ('clean', 'light', 'moderate', 'heavy', 'deficient')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'needs_service', 'overdue')),
  last_service_date DATE,
  next_due_date DATE,
  service_frequency_days INTEGER,
  deficiency_count INTEGER NOT NULL DEFAULT 0,
  qr_code_id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  notes TEXT DEFAULT '',
  custom_fields JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- QR codes must be unique within an org for scan routing
ALTER TABLE equipment ADD CONSTRAINT equipment_org_qr_unique UNIQUE (organization_id, qr_code_id);

CREATE INDEX IF NOT EXISTS idx_equipment_org ON equipment(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_org_location ON equipment(organization_id, location_id);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_next_due ON equipment(next_due_date) WHERE status IN ('needs_service', 'overdue') AND archived_at IS NULL;

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org equipment" ON equipment;
CREATE POLICY "Users can view own org equipment"
  ON equipment FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own org equipment" ON equipment;
CREATE POLICY "Users can insert own org equipment"
  ON equipment FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own org equipment" ON equipment;
CREATE POLICY "Users can update own org equipment"
  ON equipment FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own org equipment" ON equipment;
CREATE POLICY "Users can delete own org equipment"
  ON equipment FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access equipment" ON equipment;
CREATE POLICY "Service role full access equipment"
  ON equipment FOR ALL TO service_role USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_equipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS equipment_updated_at ON equipment;
CREATE TRIGGER equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();

-- ─────────────────────────────────────────────────────────────────────
-- TABLE 2: equipment_service_records
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS equipment_service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL,
  technician_name TEXT DEFAULT '',
  condition_before TEXT CHECK (condition_before IN ('clean', 'light', 'moderate', 'heavy', 'deficient')),
  condition_after TEXT CHECK (condition_after IN ('clean', 'light', 'moderate', 'heavy', 'deficient')),
  duration_minutes INTEGER,
  notes TEXT DEFAULT '',
  certificate_number TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  cost NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_service_equipment ON equipment_service_records(equipment_id, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_service_org ON equipment_service_records(organization_id);

ALTER TABLE equipment_service_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org service records" ON equipment_service_records;
CREATE POLICY "Users can view own org service records"
  ON equipment_service_records FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own org service records" ON equipment_service_records;
CREATE POLICY "Users can insert own org service records"
  ON equipment_service_records FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own org service records" ON equipment_service_records;
CREATE POLICY "Users can update own org service records"
  ON equipment_service_records FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access service records" ON equipment_service_records;
CREATE POLICY "Service role full access service records"
  ON equipment_service_records FOR ALL TO service_role USING (true);

-- ─────────────────────────────────────────────────────────────────────
-- TABLE 3: equipment_deficiencies
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS equipment_deficiencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'major', 'minor')),
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  found_date DATE NOT NULL DEFAULT CURRENT_DATE,
  resolved_date DATE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_deficiencies_equipment ON equipment_deficiencies(equipment_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_deficiencies_org ON equipment_deficiencies(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_deficiencies_open ON equipment_deficiencies(status) WHERE status = 'open';

ALTER TABLE equipment_deficiencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org equipment deficiencies" ON equipment_deficiencies;
CREATE POLICY "Users can view own org equipment deficiencies"
  ON equipment_deficiencies FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own org equipment deficiencies" ON equipment_deficiencies;
CREATE POLICY "Users can insert own org equipment deficiencies"
  ON equipment_deficiencies FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own org equipment deficiencies" ON equipment_deficiencies;
CREATE POLICY "Users can update own org equipment deficiencies"
  ON equipment_deficiencies FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access equipment deficiencies" ON equipment_deficiencies;
CREATE POLICY "Service role full access equipment deficiencies"
  ON equipment_deficiencies FOR ALL TO service_role USING (true);

-- ─────────────────────────────────────────────────────────────────────
-- TABLE 4: equipment_documents
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS equipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('certificate', 'installation', 'warranty', 'manual', 'other')),
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One file per storage path — prevents accidental dupes
ALTER TABLE equipment_documents ADD CONSTRAINT equipment_documents_storage_path_unique UNIQUE (storage_path);

CREATE INDEX IF NOT EXISTS idx_equipment_documents_equipment ON equipment_documents(equipment_id, document_type);
CREATE INDEX IF NOT EXISTS idx_equipment_documents_org ON equipment_documents(organization_id);

ALTER TABLE equipment_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org equipment documents" ON equipment_documents;
CREATE POLICY "Users can view own org equipment documents"
  ON equipment_documents FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own org equipment documents" ON equipment_documents;
CREATE POLICY "Users can insert own org equipment documents"
  ON equipment_documents FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own org equipment documents" ON equipment_documents;
CREATE POLICY "Users can update own org equipment documents"
  ON equipment_documents FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own org equipment documents" ON equipment_documents;
CREATE POLICY "Users can delete own org equipment documents"
  ON equipment_documents FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access equipment documents" ON equipment_documents;
CREATE POLICY "Service role full access equipment documents"
  ON equipment_documents FOR ALL TO service_role USING (true);

-- ─────────────────────────────────────────────────────────────────────
-- STORAGE: equipment-documents bucket
--
-- Path convention (MUST be followed by all uploaders):
--   {organization_id}/{equipment_id}/{filename}
--
-- Example:
--   a1b2c3d4-…/e5f6g7h8-…/ansul-cert-2026.pdf
--
-- RLS on storage.objects uses path prefix to scope access:
--   - Users can only read/write objects whose path starts with their org_id
--   - This ensures cross-org isolation at the storage layer
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'equipment-documents',
  'equipment-documents',
  false,
  10485760, -- 10 MB max
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: read access scoped to org via path prefix
DROP POLICY IF EXISTS "Org members can read equipment documents" ON storage.objects;
CREATE POLICY "Org members can read equipment documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'equipment-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Storage RLS: upload access scoped to org via path prefix
DROP POLICY IF EXISTS "Org members can upload equipment documents" ON storage.objects;
CREATE POLICY "Org members can upload equipment documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'equipment-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Storage RLS: update (overwrite) access scoped to org via path prefix
DROP POLICY IF EXISTS "Org members can update equipment documents" ON storage.objects;
CREATE POLICY "Org members can update equipment documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'equipment-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Storage RLS: delete access scoped to org via path prefix
DROP POLICY IF EXISTS "Org members can delete equipment documents" ON storage.objects;
CREATE POLICY "Org members can delete equipment documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'equipment-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Service role full access to storage bucket
DROP POLICY IF EXISTS "Service role full access equipment storage" ON storage.objects;
CREATE POLICY "Service role full access equipment storage"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'equipment-documents');
