-- ============================================================
-- Sprint 1.1 (corrected) — Consolidate to service_type_definitions
-- as the single canonical service catalog.
--
-- Adds: is_pse, is_cwa, regulatory_floor_days, default_cadence_days,
--        tooltip_risk_copy, managed_by_category
-- Keeps: vendors.is_cleaning_pros_plus, vendor_service_capabilities
-- Drops: service_catalog table approach entirely
-- ============================================================

-- ── A. ALTER service_type_definitions — add missing columns ──

ALTER TABLE service_type_definitions
  ADD COLUMN IF NOT EXISTS is_pse boolean NOT NULL DEFAULT false;

ALTER TABLE service_type_definitions
  ADD COLUMN IF NOT EXISTS is_cwa boolean NOT NULL DEFAULT false;

ALTER TABLE service_type_definitions
  ADD COLUMN IF NOT EXISTS regulatory_floor_days integer;

ALTER TABLE service_type_definitions
  ADD COLUMN IF NOT EXISTS default_cadence_days integer;

ALTER TABLE service_type_definitions
  ADD COLUMN IF NOT EXISTS tooltip_risk_copy text;

ALTER TABLE service_type_definitions
  ADD COLUMN IF NOT EXISTS managed_by_category text;


-- ── B. UPDATE existing rows with new column values ──────────

-- Fire Safety: KEC family
UPDATE service_type_definitions SET
  is_pse = true, is_cwa = false,
  regulatory_floor_days = 90, default_cadence_days = 90
WHERE code = 'KEC';

UPDATE service_type_definitions SET
  is_pse = false, is_cwa = true,
  regulatory_floor_days = 90, default_cadence_days = 90,
  tooltip_risk_copy = 'Replaces saturated baffle filters off-site under NFPA 96. Required for Clean Water Act compliance — on-site wash discharges into sanitary drain in violation of CWA wastewater pH limits. Without GFX, filter grease saturation also increases fire load.'
WHERE code = 'GFX';

UPDATE service_type_definitions SET
  is_pse = false, is_cwa = false,
  regulatory_floor_days = 180, default_cadence_days = 180,
  tooltip_risk_copy = 'Preventive maintenance for the exhaust fan under NFPA 96 — belts, bearings, motor amperage, vibration. Without FPM, fan failure risk goes unidentified between cleanings.'
WHERE code = 'FPM';

UPDATE service_type_definitions SET
  is_pse = false, is_cwa = false,
  regulatory_floor_days = 90, default_cadence_days = 90,
  tooltip_risk_copy = 'Captures rooftop grease before it accumulates under NFPA 96. Without RGC, rooftop grease creates fire spread vector.'
WHERE code = 'RGC';

-- Fire Safety: Protection systems
UPDATE service_type_definitions SET
  is_pse = true, is_cwa = false,
  regulatory_floor_days = 180, default_cadence_days = 180
WHERE code = 'FS';

UPDATE service_type_definitions SET
  is_pse = true, is_cwa = false,
  regulatory_floor_days = 365, default_cadence_days = 365
WHERE code = 'FA';

UPDATE service_type_definitions SET
  is_pse = true, is_cwa = false,
  regulatory_floor_days = 90, default_cadence_days = 90
WHERE code = 'SP';

UPDATE service_type_definitions SET
  is_pse = false, is_cwa = false,
  regulatory_floor_days = 365, default_cadence_days = 365
WHERE code = 'FE';

-- Food Safety
UPDATE service_type_definitions SET
  is_pse = false, is_cwa = false,
  regulatory_floor_days = NULL, default_cadence_days = 30,
  managed_by_category = 'facility_services'
WHERE code = 'PC';

UPDATE service_type_definitions SET
  is_pse = false, is_cwa = false,
  regulatory_floor_days = NULL, default_cadence_days = 90,
  managed_by_category = 'facility_services'
WHERE code = 'GT';

UPDATE service_type_definitions SET
  is_pse = false, is_cwa = false,
  regulatory_floor_days = 365, default_cadence_days = 365,
  managed_by_category = 'facility_services'
WHERE code = 'BFT';

-- Facility Services: derive default_cadence_days from existing default_frequency
UPDATE service_type_definitions SET
  is_pse = false, is_cwa = false,
  regulatory_floor_days = NULL,
  default_cadence_days = CASE default_frequency
    WHEN 'monthly'      THEN 30
    WHEN 'quarterly'    THEN 90
    WHEN 'semi_annual'  THEN 180
    WHEN 'annual'       THEN 365
    ELSE 90
  END
WHERE category = 'facility_services';


-- ── C. vendors.is_cleaning_pros_plus (unchanged from Sprint 1.1) ──

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS is_cleaning_pros_plus boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vendors_is_cpp
  ON vendors (is_cleaning_pros_plus) WHERE is_cleaning_pros_plus = true;

UPDATE vendors
SET    is_cleaning_pros_plus = true
WHERE  (company_name ILIKE '%Cleaning Pros Plus%' OR company_name ILIKE '%CPP%')
  AND  is_cleaning_pros_plus = false;


-- ── D. vendor_service_capabilities (FK → service_type_definitions) ──

CREATE TABLE IF NOT EXISTS vendor_service_capabilities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  service_code    text NOT NULL REFERENCES service_type_definitions(code) ON DELETE CASCADE,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (vendor_id, service_code)
);

CREATE INDEX IF NOT EXISTS idx_vsc_vendor  ON vendor_service_capabilities (vendor_id);
CREATE INDEX IF NOT EXISTS idx_vsc_service ON vendor_service_capabilities (service_code);

ALTER TABLE vendor_service_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view vendor capabilities in their organization"
  ON vendor_service_capabilities;
CREATE POLICY "Users can view vendor capabilities in their organization"
  ON vendor_service_capabilities FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE organization_id IN (
        SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Service role full access to vendor capabilities"
  ON vendor_service_capabilities;
CREATE POLICY "Service role full access to vendor capabilities"
  ON vendor_service_capabilities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── E. Seed CPP capabilities (uppercase codes) ─────────────

INSERT INTO vendor_service_capabilities (vendor_id, service_code)
SELECT v.id, std.code
FROM   vendors v
       CROSS JOIN service_type_definitions std
WHERE  v.is_cleaning_pros_plus = true
  AND  std.code IN ('KEC', 'GFX', 'FPM', 'RGC')
ON CONFLICT (vendor_id, service_code) DO NOTHING;


-- ── F. Done ─────────────────────────────────────────────────
