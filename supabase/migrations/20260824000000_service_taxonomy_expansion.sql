-- ============================================================================
-- SERVICE TAXONOMY EXPANSION
-- Adds category + sort_order to service_type_definitions.
-- Backfills 9 existing rows. Seeds 15 new service types.
-- Existing codes (KEC, FPM, GFX, RGC, FS, FA, SP, FE, PC) unchanged.
-- ============================================================================

-- ── 1. Add columns ──────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE service_type_definitions ADD COLUMN category TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE service_type_definitions ADD COLUMN sort_order INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Category check constraint (idempotent)
DO $$ BEGIN
  ALTER TABLE service_type_definitions
    ADD CONSTRAINT service_type_definitions_category_check
    CHECK (category IN ('food_safety', 'fire_safety', 'facility_services'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Backfill existing 9 rows ────────────────────────────────────────────

UPDATE service_type_definitions SET category = 'fire_safety', sort_order = 10  WHERE code = 'KEC';
UPDATE service_type_definitions SET category = 'fire_safety', sort_order = 11  WHERE code = 'FPM';
UPDATE service_type_definitions SET category = 'fire_safety', sort_order = 12  WHERE code = 'GFX';
UPDATE service_type_definitions SET category = 'fire_safety', sort_order = 13  WHERE code = 'RGC';
UPDATE service_type_definitions SET category = 'fire_safety', sort_order = 20  WHERE code = 'FS';
UPDATE service_type_definitions SET category = 'fire_safety', sort_order = 30  WHERE code = 'FA';
UPDATE service_type_definitions SET category = 'fire_safety', sort_order = 40  WHERE code = 'SP';
UPDATE service_type_definitions SET category = 'fire_safety', sort_order = 50  WHERE code = 'FE';
UPDATE service_type_definitions SET category = 'food_safety', sort_order = 20  WHERE code = 'PC';

-- ── 3. Seed new Food Safety codes ───────────────────────────────────────────

INSERT INTO service_type_definitions (code, name, short_name, description, parent_code, category, sort_order, icon, color, badge_bg, badge_text, default_frequency, compliance_codes)
VALUES
  ('GT', 'Grease Trap/Interceptor Service', 'Grease Trap', 'Grease trap/interceptor cleaning and inspection', NULL, 'food_safety', 10, 'Droplets', '#92400E', '#FFFBEB', '#92400E', 'quarterly', ARRAY[]::text[]),
  ('BFT', 'Backflow Prevention Testing', 'Backflow Testing', 'Annual backflow preventer testing and certification', NULL, 'food_safety', 30, 'ArrowDownUp', '#0369A1', '#F0F9FF', '#0369A1', 'annual', ARRAY[]::text[])
ON CONFLICT (code) DO NOTHING;

-- ── 4. Seed new Facility Services codes ─────────────────────────────────────

INSERT INTO service_type_definitions (code, name, short_name, description, parent_code, category, sort_order, icon, color, badge_bg, badge_text, default_frequency, compliance_codes)
VALUES
  ('HVAC', 'HVAC Service', 'HVAC', 'Heating, ventilation, and air conditioning service', NULL, 'facility_services', 10, 'Thermometer', '#0E7490', '#ECFEFF', '#0E7490', 'quarterly', ARRAY[]::text[]),
  ('PLMB', 'Plumbing Service', 'Plumbing', 'Commercial plumbing maintenance and repair', NULL, 'facility_services', 20, 'Wrench', '#4338CA', '#EEF2FF', '#4338CA', 'annual', ARRAY[]::text[]),
  ('ELEC', 'Electrical Service', 'Electrical', 'Commercial electrical maintenance and repair', NULL, 'facility_services', 30, 'Zap', '#B45309', '#FFFBEB', '#B45309', 'annual', ARRAY[]::text[]),
  ('REFR', 'Refrigeration Service', 'Refrigeration', 'Walk-in cooler, freezer, and reach-in refrigeration service', NULL, 'facility_services', 40, 'Snowflake', '#0284C7', '#F0F9FF', '#0284C7', 'quarterly', ARRAY[]::text[]),
  ('JANI', 'Cleaning/Janitorial Service', 'Janitorial', 'Commercial kitchen and facility cleaning service', NULL, 'facility_services', 50, 'SprayCanIcon', '#059669', '#ECFDF5', '#059669', 'monthly', ARRAY[]::text[]),
  ('PRES', 'Pressure Washing Service', 'Pressure Washing', 'Exterior and equipment pressure washing', NULL, 'facility_services', 60, 'Waves', '#0369A1', '#F0F9FF', '#0369A1', 'quarterly', ARRAY[]::text[]),
  ('LOCK', 'Locksmith Service', 'Locksmith', 'Commercial lock, key, and access control service', NULL, 'facility_services', 70, 'Lock', '#6D28D9', '#F5F3FF', '#6D28D9', 'annual', ARRAY[]::text[]),
  ('ROOF', 'Roofing Service', 'Roofing', 'Commercial roof maintenance and repair', NULL, 'facility_services', 80, 'Home', '#78350F', '#FFFBEB', '#78350F', 'annual', ARRAY[]::text[]),
  ('EQRP', 'Equipment Repair Service', 'Equipment Repair', 'Commercial kitchen equipment repair and maintenance', NULL, 'facility_services', 90, 'Settings', '#374151', '#F9FAFB', '#374151', 'quarterly', ARRAY[]::text[]),
  ('WDSP', 'Waste/Recycling/Disposal Service', 'Waste Disposal', 'Waste removal, recycling, and grease disposal', NULL, 'facility_services', 100, 'Trash2', '#65A30D', '#F7FEE7', '#65A30D', 'monthly', ARRAY[]::text[]),
  ('LINN', 'Linen Service', 'Linen', 'Commercial linen and uniform rental service', NULL, 'facility_services', 110, 'Shirt', '#9333EA', '#FAF5FF', '#9333EA', 'monthly', ARRAY[]::text[]),
  ('WINC', 'Window Cleaning Service', 'Window Cleaning', 'Commercial window cleaning service', NULL, 'facility_services', 120, 'Maximize', '#0891B2', '#ECFEFF', '#0891B2', 'quarterly', ARRAY[]::text[]),
  ('LAND', 'Landscaping Service', 'Landscaping', 'Exterior landscaping and grounds maintenance', NULL, 'facility_services', 130, 'TreePine', '#15803D', '#F0FDF4', '#15803D', 'monthly', ARRAY[]::text[])
ON CONFLICT (code) DO NOTHING;
