-- ============================================================
-- Sprint 1.1 — Service Catalog Foundation
-- Tables: service_catalog, vendor_service_capabilities
-- Column: vendors.is_cleaning_pros_plus
-- No UI changes — schema + seed data only.
-- ============================================================

-- ── A. service_catalog ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_catalog (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 text        NOT NULL UNIQUE,
  display_name         text        NOT NULL,
  pillar               text        NOT NULL CHECK (pillar IN ('fire_safety', 'food_safety')),
  regulatory_basis     text[],
  default_cadence_days integer,
  pse_required         boolean     NOT NULL DEFAULT false,
  is_cwa               boolean     NOT NULL DEFAULT false,
  managed_by           text,
  parent_service_code  text        REFERENCES service_catalog(code) DEFERRABLE INITIALLY DEFERRED,
  tooltip_risk_copy    text,
  regulatory_floor_days integer,
  sort_order           integer     NOT NULL DEFAULT 0,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_catalog_pillar ON service_catalog (pillar);
CREATE INDEX IF NOT EXISTS idx_service_catalog_code   ON service_catalog (code);

ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read the catalog (global reference data)
DROP POLICY IF EXISTS "Authenticated users can read service catalog" ON service_catalog;
CREATE POLICY "Authenticated users can read service catalog"
  ON service_catalog FOR SELECT
  TO authenticated
  USING (true);

-- Service role has full access (seeding, admin)
DROP POLICY IF EXISTS "Service role full access to service catalog" ON service_catalog;
CREATE POLICY "Service role full access to service catalog"
  ON service_catalog FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed 10 canonical services
INSERT INTO service_catalog (
  code, display_name, pillar, regulatory_basis,
  default_cadence_days, pse_required, is_cwa, managed_by,
  parent_service_code, tooltip_risk_copy, regulatory_floor_days, sort_order
)
VALUES
  (
    'kec', 'Kitchen Exhaust Cleaning', 'fire_safety',
    ARRAY['NFPA 96'],
    90, false, false, NULL,
    NULL, NULL, 90, 1
  ),
  (
    'gfx', 'Grease Filter Exchange (GFX)', 'fire_safety',
    ARRAY['NFPA 96'],
    90, false, true, NULL,
    'kec',
    'Replaces saturated baffle filters off-site under NFPA 96. Required for Clean Water Act compliance — on-site wash discharges into sanitary drain in violation of CWA wastewater pH limits. Without GFX, filter grease saturation also increases fire load.',
    90, 2
  ),
  (
    'fpm', 'Fan Performance Management (FPM)', 'fire_safety',
    ARRAY['NFPA 96'],
    180, false, false, NULL,
    'kec',
    'Preventive maintenance for the exhaust fan under NFPA 96 — belts, bearings, motor amperage, vibration. Without FPM, fan failure risk goes unidentified between cleanings.',
    180, 3
  ),
  (
    'rgc', 'Rooftop Grease Containment (RGC)', 'fire_safety',
    ARRAY['NFPA 96'],
    90, false, false, NULL,
    'kec',
    'Captures rooftop grease before it accumulates under NFPA 96. Without RGC, rooftop grease creates fire spread vector.',
    90, 4
  ),
  (
    'fire_suppression', 'Fire Suppression', 'fire_safety',
    ARRAY['NFPA 17A', 'NFPA 96'],
    180, true, false, NULL,
    NULL, NULL, 180, 5
  ),
  (
    'fire_alarm', 'Automatic Fire Alarm', 'fire_safety',
    ARRAY['NFPA 72'],
    365, true, false, NULL,
    NULL, NULL, 365, 6
  ),
  (
    'fire_sprinkler', 'Fire Sprinkler', 'fire_safety',
    ARRAY['NFPA 25'],
    365, true, false, NULL,
    NULL, NULL, 90, 7
  ),
  (
    'fire_extinguisher', 'Fire Extinguishers', 'fire_safety',
    ARRAY['NFPA 10'],
    365, false, false, NULL,
    NULL, NULL, 365, 8
  ),
  (
    'pest_control', 'Pest Control', 'food_safety',
    ARRAY['CalCode §114259.1'],
    30, false, false, 'facility_services',
    NULL, NULL, NULL, 9
  ),
  (
    'grease_trap', 'Grease Trap Service', 'food_safety',
    ARRAY['Local FOG ordinance'],
    90, false, false, 'facility_services',
    NULL, NULL, NULL, 10
  )
ON CONFLICT (code) DO UPDATE SET
  display_name         = EXCLUDED.display_name,
  pillar               = EXCLUDED.pillar,
  regulatory_basis     = EXCLUDED.regulatory_basis,
  default_cadence_days = EXCLUDED.default_cadence_days,
  pse_required         = EXCLUDED.pse_required,
  is_cwa               = EXCLUDED.is_cwa,
  managed_by           = EXCLUDED.managed_by,
  parent_service_code  = EXCLUDED.parent_service_code,
  tooltip_risk_copy    = EXCLUDED.tooltip_risk_copy,
  regulatory_floor_days = EXCLUDED.regulatory_floor_days,
  sort_order           = EXCLUDED.sort_order,
  updated_at           = now();


-- ── B. vendors.is_cleaning_pros_plus ────────────────────────

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_cleaning_pros_plus boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vendors_is_cpp ON vendors (is_cleaning_pros_plus) WHERE is_cleaning_pros_plus = true;

-- Backfill: mark any vendor whose company_name contains 'Cleaning Pros Plus' or 'CPP'
UPDATE vendors
SET    is_cleaning_pros_plus = true
WHERE  (company_name ILIKE '%Cleaning Pros Plus%' OR company_name ILIKE '%CPP%')
  AND  is_cleaning_pros_plus = false;


-- ── C. vendor_service_capabilities ──────────────────────────

CREATE TABLE IF NOT EXISTS vendor_service_capabilities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       uuid        NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  service_code    text        NOT NULL REFERENCES service_catalog(code) ON DELETE CASCADE,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (vendor_id, service_code)
);

CREATE INDEX IF NOT EXISTS idx_vsc_vendor  ON vendor_service_capabilities (vendor_id);
CREATE INDEX IF NOT EXISTS idx_vsc_service ON vendor_service_capabilities (service_code);

ALTER TABLE vendor_service_capabilities ENABLE ROW LEVEL SECURITY;

-- Users can view capabilities for vendors in their org
DROP POLICY IF EXISTS "Users can view vendor capabilities in their organization" ON vendor_service_capabilities;
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

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to vendor capabilities" ON vendor_service_capabilities;
CREATE POLICY "Service role full access to vendor capabilities"
  ON vendor_service_capabilities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed CPP vendor capabilities: KEC + GFX + FPM + RGC for every CPP vendor
INSERT INTO vendor_service_capabilities (vendor_id, service_code)
SELECT v.id, sc.code
FROM   vendors v
       CROSS JOIN service_catalog sc
WHERE  v.is_cleaning_pros_plus = true
  AND  sc.code IN ('kec', 'gfx', 'fpm', 'rgc')
ON CONFLICT (vendor_id, service_code) DO NOTHING;


-- ── D. Done ─────────────────────────────────────────────────
