-- ============================================================
-- Regulatory Change Alerts — Task #48 (Roadmap #6)
-- ============================================================
-- AI-monitored regulatory code changes with admin review
-- and jurisdiction-filtered push to affected customers.
-- ============================================================

-- ── Regulatory Sources (what EvidLY monitors) ───────────────

CREATE TABLE IF NOT EXISTS regulatory_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_name TEXT NOT NULL,
  code_short TEXT NOT NULL UNIQUE,
  jurisdiction_type TEXT NOT NULL CHECK (jurisdiction_type IN ('federal', 'state', 'county', 'city', 'industry')),
  jurisdiction_code TEXT,
  current_edition TEXT,
  issuing_body TEXT NOT NULL,
  monitoring_url TEXT,
  last_checked TIMESTAMPTZ,
  last_change_detected TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with known sources
INSERT INTO regulatory_sources (code_name, code_short, jurisdiction_type, jurisdiction_code, current_edition, issuing_body, monitoring_url) VALUES
  ('FDA Food Code', 'fda_food_code', 'federal', NULL, '2022', 'U.S. Food and Drug Administration', 'https://www.fda.gov/food/retail-food-protection/fda-food-code'),
  ('NFPA 96 (Ventilation & Fire Protection)', 'nfpa_96', 'industry', NULL, '2025', 'National Fire Protection Association', 'https://www.nfpa.org/codes-and-standards/nfpa-96-standard-development/96'),
  ('NFPA 10 (Portable Fire Extinguishers)', 'nfpa_10', 'industry', NULL, '2025', 'National Fire Protection Association', 'https://www.nfpa.org/codes-and-standards/nfpa-10-standard-development/10'),
  ('NFPA 17A (Wet Chemical Suppression)', 'nfpa_17a', 'industry', NULL, '2021', 'National Fire Protection Association', NULL),
  ('California Retail Food Code (CalCode)', 'calcode', 'state', 'CA', '2024', 'California Legislature', 'https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx'),
  ('California Health & Safety Code', 'ca_hsc', 'state', 'CA', '2024', 'California Legislature', NULL),
  ('California Fire Code (CFC)', 'cfc', 'state', 'CA', '2022', 'Office of the State Fire Marshal', 'https://osfm.fire.ca.gov/what-we-do/fire-engineering-and-investigations/codes-and-standards'),
  ('Texas Food Establishment Rules', 'tx_food', 'state', 'TX', '2024', 'Texas DSHS', NULL),
  ('Florida DBPR Food Code', 'fl_food', 'state', 'FL', '2024', 'Florida DBPR', NULL),
  ('New York State Sanitary Code', 'ny_food', 'state', 'NY', '2024', 'New York DOH', NULL),
  ('International Mechanical Code', 'imc', 'industry', NULL, '2021', 'ICC', NULL),
  ('International Fire Code', 'ifc', 'industry', NULL, '2021', 'ICC', NULL),
  ('Cal/OSHA Workplace Safety', 'cal_osha', 'state', 'CA', '2024', 'California DIR', 'https://www.dir.ca.gov/dosh/')
ON CONFLICT (code_short) DO NOTHING;

-- ── Regulatory Changes (individual change records) ──────────

CREATE TABLE IF NOT EXISTS regulatory_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES regulatory_sources(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('amendment', 'new_edition', 'guidance', 'enforcement_change', 'effective_date')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  impact_description TEXT NOT NULL,
  impact_level TEXT NOT NULL CHECK (impact_level IN ('critical', 'moderate', 'informational')),
  affected_pillars TEXT[] DEFAULT '{}',
  affected_equipment_types TEXT[] DEFAULT '{}',
  affected_states TEXT[],
  effective_date DATE,
  source_url TEXT,
  raw_input_text TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT true,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  affected_location_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_changes_published ON regulatory_changes(published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reg_changes_states ON regulatory_changes USING GIN(affected_states);
CREATE INDEX IF NOT EXISTS idx_reg_changes_pillars ON regulatory_changes USING GIN(affected_pillars);

-- ── Customer Change Acknowledgments ─────────────────────────

CREATE TABLE IF NOT EXISTS regulatory_change_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id UUID NOT NULL REFERENCES regulatory_changes(id),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (change_id, user_id)
);

-- ── RLS Policies ────────────────────────────────────────────

ALTER TABLE regulatory_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_change_reads ENABLE ROW LEVEL SECURITY;

-- Sources are readable by all authenticated users
CREATE POLICY "regulatory_sources_read" ON regulatory_sources
  FOR SELECT TO authenticated USING (true);

-- Published changes are readable by all; unpublished only by admin
CREATE POLICY "regulatory_changes_read" ON regulatory_changes
  FOR SELECT TO authenticated
  USING (published = true OR auth.jwt() ->> 'email' LIKE '%@getevidly.com');

-- Only admin can insert/update changes
CREATE POLICY "regulatory_changes_admin_write" ON regulatory_changes
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

-- Users can read and create their own acknowledgments
CREATE POLICY "regulatory_change_reads_user" ON regulatory_change_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid());
