-- ═══════════════════════════════════════════════════════════════════
-- GAP-12: Multi-AHJ (Authority Having Jurisdiction) Support
-- ═══════════════════════════════════════════════════════════════════
-- Adds support for locations with multiple authorities per pillar.
-- Example: Aramark Yosemite has BOTH Mariposa County Environmental
-- Health AND NPS (National Park Service) as food safety AHJs.
--
-- Resolution rule: Compliance status = MORE STRINGENT of all AHJs.
-- If one authority says "Pass" and another says "At Risk", the
-- location's resolved status is "At Risk".
--
-- This migration adds:
--   1. jurisdiction_layer column to location_jurisdictions
--   2. federal_overlay_jurisdictions table for federal authority records
--   3. resolved_status view that computes worst-case per pillar
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Add jurisdiction_layer to existing table ──────────────────

ALTER TABLE location_jurisdictions
  ADD COLUMN IF NOT EXISTS jurisdiction_layer TEXT NOT NULL DEFAULT 'primary'
    CHECK (jurisdiction_layer IN ('primary', 'federal_overlay', 'state_overlay'));

COMMENT ON COLUMN location_jurisdictions.jurisdiction_layer IS
  'Authority layer: primary (county/city), federal_overlay (NPS, military), state_overlay (CDPH)';

-- ── 2. Federal overlay jurisdictions table ───────────────────────

CREATE TABLE IF NOT EXISTS federal_overlay_jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  pillar TEXT NOT NULL CHECK (pillar IN ('food_safety', 'facility_safety')),

  -- Federal authority details
  agency_name TEXT NOT NULL,
  agency_phone TEXT,
  agency_website TEXT,
  code_basis TEXT NOT NULL,
  code_references TEXT[] DEFAULT '{}',
  scoring_method TEXT,
  grading_type TEXT,
  grading_config JSONB DEFAULT '{}',
  inspection_frequency INTEGER, -- times per year
  is_verified BOOLEAN DEFAULT FALSE,
  local_amendments TEXT,

  -- Layer metadata
  jurisdiction_layer TEXT NOT NULL DEFAULT 'federal_overlay'
    CHECK (jurisdiction_layer IN ('federal_overlay', 'state_overlay')),
  federal_agency_code TEXT, -- e.g. 'NPS', 'DOD', 'VA'
  federal_unit_name TEXT,   -- e.g. 'Yosemite National Park'

  -- Status tracking
  last_inspection_date DATE,
  current_status TEXT CHECK (current_status IN ('passing', 'at_risk', 'failing', 'unknown')),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One federal overlay per pillar per location per agency
  UNIQUE (location_id, pillar, federal_agency_code)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_federal_overlay_location
  ON federal_overlay_jurisdictions(location_id, pillar);

COMMENT ON TABLE federal_overlay_jurisdictions IS
  'Federal/state authority overlays that apply IN ADDITION TO the primary county/city AHJ. '
  'Example: NPS food safety inspections at Yosemite (on top of Mariposa County).';

-- ── 3. Resolved compliance status view ───────────────────────────
-- Computes worst-case status across all AHJs per location per pillar

CREATE OR REPLACE VIEW v_resolved_ahj_status AS
SELECT
  lj.location_id,
  lj.pillar,
  -- Primary AHJ status
  lj.current_status AS primary_status,
  lj.agency_name AS primary_agency,
  -- Federal overlay status (NULL if none)
  foj.current_status AS federal_status,
  foj.agency_name AS federal_agency,
  foj.federal_agency_code,
  -- Resolved = worst-case
  CASE
    WHEN foj.id IS NULL THEN lj.current_status
    WHEN lj.current_status = 'failing' OR foj.current_status = 'failing' THEN 'failing'
    WHEN lj.current_status = 'at_risk' OR foj.current_status = 'at_risk' THEN 'at_risk'
    WHEN lj.current_status = 'passing' AND foj.current_status = 'passing' THEN 'passing'
    ELSE 'unknown'
  END AS resolved_status,
  -- Multi-AHJ flag
  (foj.id IS NOT NULL) AS is_multi_ahj
FROM location_jurisdictions lj
LEFT JOIN federal_overlay_jurisdictions foj
  ON foj.location_id = lj.location_id
  AND foj.pillar = lj.pillar
WHERE lj.jurisdiction_layer = 'primary';

COMMENT ON VIEW v_resolved_ahj_status IS
  'Resolved compliance status per location per pillar. '
  'When multiple AHJs exist, uses worst-case (most stringent) status.';

-- ── 4. RLS policies ─────────────────────────────────────────────

ALTER TABLE federal_overlay_jurisdictions ENABLE ROW LEVEL SECURITY;

-- Read: authenticated users can read overlays for their org's locations
CREATE POLICY "Users can read federal overlays for their locations"
  ON federal_overlay_jurisdictions FOR SELECT
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN organization_members om ON om.organization_id = l.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Write: only org admins
CREATE POLICY "Admins can manage federal overlays"
  ON federal_overlay_jurisdictions FOR ALL
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN organization_members om ON om.organization_id = l.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner_operator', 'executive', 'platform_admin')
    )
  );

-- ── 5. Updated_at trigger ────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_federal_overlay_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_federal_overlay_updated_at
  BEFORE UPDATE ON federal_overlay_jurisdictions
  FOR EACH ROW
  EXECUTE FUNCTION update_federal_overlay_updated_at();
