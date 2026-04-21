-- ═══════════════════════════════════════════════════════════════
-- HOODOPS-SERVICES-01 — Service type definitions + schedules
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Service type definitions ────────────────────────────
CREATE TABLE IF NOT EXISTS service_type_definitions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,          -- KEC, FPM, GFX, RGC, FS
  name          text NOT NULL,
  short_name    text NOT NULL,
  description   text,
  parent_code   text REFERENCES service_type_definitions(code),
  icon          text NOT NULL DEFAULT 'Wrench',
  color         text NOT NULL DEFAULT '#6B7280',
  badge_bg      text NOT NULL DEFAULT '#F3F4F6',
  badge_text    text NOT NULL DEFAULT '#6B7280',
  base_price    numeric(10,2) NOT NULL DEFAULT 0,
  compliance_codes text[] NOT NULL DEFAULT '{}',
  default_frequency text NOT NULL DEFAULT 'quarterly',
  nfpa_citation text,
  catalog_id    text,                          -- maps to serviceCatalog.ts CPP_SERVICES id
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Seed the 5 service types
INSERT INTO service_type_definitions (code, name, short_name, description, parent_code, icon, color, badge_bg, badge_text, base_price, compliance_codes, default_frequency, nfpa_citation, catalog_id) VALUES
  ('KEC', 'Kitchen Exhaust Cleaning', 'Exhaust Cleaning', 'NFPA 96 Table 12.4 compliant hood & duct cleaning with IKECA-certified documentation', NULL, 'Flame', '#C2410C', '#FFF7ED', '#C2410C', 450.00, ARRAY['NFPA96-T12.4','CFC-904.12'], 'quarterly', 'NFPA 96-2024 Table 12.4', 'hood_cleaning'),
  ('FPM', 'Fan Performance Management', 'Fan Performance', 'Exhaust fan inspection, belt service, bearing lubrication, and airflow verification', 'KEC', 'Fan', '#1E40AF', '#EFF6FF', '#1E40AF', 150.00, ARRAY['NFPA96-CH11'], 'quarterly', 'NFPA 96 Chapter 11', 'fan_performance'),
  ('GFX', 'Grease Filter Exchange', 'Filter Exchange', 'Scheduled replacement of hood baffle filters with professionally cleaned certified units', 'KEC', 'Filter', '#166534', '#F0FDF4', '#166534', 75.00, ARRAY['NFPA96-CH9','CWA-402'], 'monthly', 'NFPA 96 Chapter 9', 'filter_exchange'),
  ('RGC', 'Rooftop Grease Containment', 'Rooftop Containment', 'Containment system service for exhaust fan rooftop discharge', 'KEC', 'Shield', '#6B21A8', '#FAF5FF', '#6B21A8', 125.00, ARRAY['NFPA96-CH11','CWA-402'], 'quarterly', 'NFPA 96 Chapter 11', 'rooftop_grease'),
  ('FS',  'Fire Suppression System', 'Fire Suppression', 'Semi-annual inspection and certification of UL-300 wet chemical fire suppression system', NULL, 'ShieldAlert', '#991B1B', '#FEF2F2', '#991B1B', 350.00, ARRAY['NFPA96-CH10','NFPA17A','UL-300'], 'semi_annual', 'NFPA 96 Chapter 10 / NFPA 17A', NULL);


-- ── 2. Equipment type definitions ──────────────────────────
CREATE TABLE IF NOT EXISTS equipment_type_definitions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  name          text NOT NULL,
  description   text,
  linked_service_code text REFERENCES service_type_definitions(code),
  custom_fields jsonb NOT NULL DEFAULT '[]',   -- [{field, label, unit, type}]
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO equipment_type_definitions (code, name, description, linked_service_code, custom_fields) VALUES
  ('EXHAUST_FAN', 'Exhaust Fan', 'Kitchen exhaust fan unit', 'FPM', '[{"field":"cfm","label":"CFM Rating","unit":"CFM","type":"number"},{"field":"motor_hp","label":"Motor HP","unit":"HP","type":"number"},{"field":"belt_type","label":"Belt Type","unit":"","type":"text"}]'::jsonb),
  ('GREASE_FILTER', 'Grease Baffle Filter', 'Hood baffle filter set', 'GFX', '[{"field":"filter_count","label":"Filter Count","unit":"filters","type":"number"},{"field":"filter_size","label":"Filter Size","unit":"inches","type":"text"}]'::jsonb),
  ('ROOFTOP_CONTAINMENT', 'Rooftop Grease Containment', 'Rooftop grease containment system', 'RGC', '[{"field":"capacity_gal","label":"Capacity","unit":"gallons","type":"number"},{"field":"material","label":"Material","unit":"","type":"text"}]'::jsonb);


-- ── 3. Location service schedules ──────────────────────────
CREATE TABLE IF NOT EXISTS location_service_schedules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL,
  location_id         uuid NOT NULL,
  service_type_code   text NOT NULL REFERENCES service_type_definitions(code),
  vendor_name         text,
  frequency           text NOT NULL DEFAULT 'quarterly',
  last_service_date   date,
  next_due_date       date,
  negotiated_price    numeric(10,2),
  notes               text,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id, service_type_code)
);

ALTER TABLE location_service_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org schedules" ON location_service_schedules;
CREATE POLICY "Users can view own org schedules"
  ON location_service_schedules FOR SELECT
  USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own org schedules" ON location_service_schedules;
CREATE POLICY "Users can manage own org schedules"
  ON location_service_schedules FOR ALL
  USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));


-- ── 4. Extend vendor_service_records ───────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_service_records' AND column_name = 'service_type_code') THEN
    ALTER TABLE vendor_service_records ADD COLUMN service_type_code text REFERENCES service_type_definitions(code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_service_records' AND column_name = 'price_charged') THEN
    ALTER TABLE vendor_service_records ADD COLUMN price_charged numeric(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_service_records' AND column_name = 'certificate_url') THEN
    ALTER TABLE vendor_service_records ADD COLUMN certificate_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_service_records' AND column_name = 'webhook_payload') THEN
    ALTER TABLE vendor_service_records ADD COLUMN webhook_payload jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_service_records' AND column_name = 'source') THEN
    ALTER TABLE vendor_service_records ADD COLUMN source text DEFAULT 'manual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_service_records' AND column_name = 'entered_by') THEN
    ALTER TABLE vendor_service_records ADD COLUMN entered_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_service_records' AND column_name = 'document_url') THEN
    ALTER TABLE vendor_service_records ADD COLUMN document_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_service_records' AND column_name = 'document_filename') THEN
    ALTER TABLE vendor_service_records ADD COLUMN document_filename text;
  END IF;
END $$;

-- Index for schedule lookups
CREATE INDEX IF NOT EXISTS idx_location_service_schedules_lookup
  ON location_service_schedules (organization_id, location_id, service_type_code);

-- Index for vendor service records by type
CREATE INDEX IF NOT EXISTS idx_vendor_service_records_type
  ON vendor_service_records (service_type_code);
