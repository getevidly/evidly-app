-- ════════════════════════════════════════════════════════════
-- SERVICE-TYPE-DEFINITIONS — 7 codes covering the four PSE safeguards
--
-- Codes:
--   KEC, FPM (KEC), GFX (KEC), RGC (KEC) — hood cleaning family
--   FS                                    — fire suppression
--   FA                                    — auto fire alarm
--   SP                                    — fire sprinkler
--
-- Sub-services (FPM, GFX, RGC) reference KEC via parent_code.
-- All base_price values default to $0; operators set per-event
-- price in vendor_service_records.price_charged.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS service_type_definitions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text NOT NULL UNIQUE,
  name                text NOT NULL,
  short_name          text NOT NULL,
  description         text,
  parent_code         text REFERENCES service_type_definitions(code),
  icon                text NOT NULL DEFAULT 'Wrench',
  color               text NOT NULL DEFAULT '#6B7280',
  badge_bg            text NOT NULL DEFAULT '#F3F4F6',
  badge_text          text NOT NULL DEFAULT '#6B7280',
  base_price          numeric(10,2) NOT NULL DEFAULT 0,
  compliance_codes    text[] NOT NULL DEFAULT '{}',
  default_frequency   text NOT NULL DEFAULT 'quarterly',
  nfpa_citation       text,
  catalog_id          text,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE service_type_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read service type definitions" ON service_type_definitions;
CREATE POLICY "Authenticated users can read service type definitions"
  ON service_type_definitions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role full access service type definitions" ON service_type_definitions;
CREATE POLICY "Service role full access service type definitions"
  ON service_type_definitions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_service_type_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_type_definitions_updated_at
  ON service_type_definitions;
CREATE TRIGGER trg_service_type_definitions_updated_at
  BEFORE UPDATE ON service_type_definitions
  FOR EACH ROW EXECUTE FUNCTION update_service_type_definitions_updated_at();

CREATE INDEX IF NOT EXISTS idx_service_type_definitions_parent
  ON service_type_definitions (parent_code) WHERE parent_code IS NOT NULL;

-- ── Seed 7 service codes ────────────────────────────────────────────

INSERT INTO service_type_definitions (
  code, name, short_name, description, parent_code, icon, color, badge_bg,
  badge_text, base_price, compliance_codes, default_frequency, nfpa_citation, catalog_id
) VALUES
  ('KEC', 'Kitchen Exhaust Cleaning', 'Hood Cleaning',
   'NFPA 96 compliant hood and duct cleaning with IKECA-certified documentation',
   NULL, 'Flame', '#C2410C', '#FFF7ED', '#C2410C',
   0.00, ARRAY['NFPA96'], 'quarterly', 'NFPA 96', 'hood_cleaning'),

  ('FPM', 'Fan Performance Management', 'Fan Performance',
   'Exhaust fan inspection, belt service, bearing lubrication, and airflow verification',
   'KEC', 'Fan', '#1E40AF', '#EFF6FF', '#1E40AF',
   0.00, ARRAY['NFPA96'], 'quarterly', 'NFPA 96', 'fan_performance'),

  ('GFX', 'Grease Filter Exchange', 'Filter Exchange',
   'Scheduled replacement of hood baffle filters with professionally cleaned certified units',
   'KEC', 'Filter', '#166534', '#F0FDF4', '#166534',
   0.00, ARRAY['NFPA96'], 'monthly', 'NFPA 96', 'filter_exchange'),

  ('RGC', 'Rooftop Grease Containment', 'Rooftop Containment',
   'Containment system service for exhaust fan rooftop discharge',
   'KEC', 'Shield', '#6B21A8', '#FAF5FF', '#6B21A8',
   0.00, ARRAY['NFPA96'], 'quarterly', 'NFPA 96', 'rooftop_grease'),

  ('FS', 'Fire Suppression System', 'Fire Suppression',
   'Semi-annual inspection and certification of UL-300 wet chemical fire suppression system',
   NULL, 'ShieldAlert', '#991B1B', '#FEF2F2', '#991B1B',
   0.00, ARRAY['NFPA96','NFPA17A','UL-300'], 'semi_annual',
   'NFPA 96 / NFPA 17A', 'fire_suppression'),

  ('FA', 'Auto Fire Alarm', 'Fire Alarm',
   'Auto fire alarm system inspection and certification per NFPA 72',
   NULL, 'BellRing', '#B91C1C', '#FEF2F2', '#B91C1C',
   0.00, ARRAY['NFPA72'], 'annual', 'NFPA 72', 'fire_alarm'),

  ('SP', 'Fire Sprinkler', 'Fire Sprinkler',
   'Fire sprinkler system inspection, testing, and maintenance per NFPA 25',
   NULL, 'Droplets', '#1D4ED8', '#EFF6FF', '#1D4ED8',
   0.00, ARRAY['NFPA25'], 'quarterly', 'NFPA 25', 'fire_sprinkler');
