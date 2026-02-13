-- Equipment Lifecycle Tracking
-- Adds warranty management, vendor linking (many-to-many), depreciation method,
-- and operational status tracking to the existing equipment table.
-- Depends on: 20260222000000_fire_safety_equipment_tables.sql (equipment table)
--             20260205175243_add_vendor_tables_and_location_count.sql (vendors table)

-- ── New columns on equipment ────────────────────────────────────────
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS warranty_start DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS warranty_contact TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS depreciation_method TEXT DEFAULT 'straight_line';
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'operational'
  CHECK (status IN ('operational', 'needs_repair', 'out_of_service', 'decommissioned'));
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS service_vendor_id UUID REFERENCES vendors(id);

-- ── equipment_vendor_links (many-to-many) ───────────────────────────
CREATE TABLE IF NOT EXISTS equipment_vendor_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(equipment_id, vendor_id, service_type)
);

-- ── Indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_equipment_vendor_links_equipment
  ON equipment_vendor_links(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_vendor_links_vendor
  ON equipment_vendor_links(vendor_id);

-- ── Row Level Security ──────────────────────────────────────────────
ALTER TABLE equipment_vendor_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org vendor links"
  ON equipment_vendor_links FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own org vendor links"
  ON equipment_vendor_links FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own org vendor links"
  ON equipment_vendor_links FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own org vendor links"
  ON equipment_vendor_links FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Service role full access vendor links"
  ON equipment_vendor_links FOR ALL TO service_role USING (true);
