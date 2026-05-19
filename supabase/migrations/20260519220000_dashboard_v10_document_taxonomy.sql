-- =====================================================================
-- Migration: Dashboard v10 — C4.5 document taxonomy + service category lock
-- Timestamp: 20260519220000
-- Commit: C4.5 of Dashboard v10 build sequence
--
-- PART A: Lock service_type_definitions.category to pillar enum
-- PART B: Create document_type_definitions table
-- PART C: Seed 14 food safety document categories (CalCode 2026)
-- PART D: Apply-time verification (Rule #14)
-- =====================================================================

-- ── PART A — CHECK constraint on service_type_definitions.category ──
-- Idempotent: constraint may already exist from a prior migration.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'service_type_definitions_category_check'
      AND table_name = 'service_type_definitions'
  ) THEN
    ALTER TABLE service_type_definitions
    ADD CONSTRAINT service_type_definitions_category_check
    CHECK (category IN ('food_safety', 'fire_safety', 'facility_services'));
  END IF;
END $$;

-- ── PART B — Create document_type_definitions table ─────────────────

CREATE TABLE document_type_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  short_name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('food_safety', 'fire_safety', 'facility_services')),
  citation_authority text,
  citation_section text,
  citation_source_url text,
  edition_year integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_type_definitions_category_active
  ON document_type_definitions (category, is_active);

CREATE INDEX idx_document_type_definitions_code
  ON document_type_definitions (code) WHERE is_active = true;

-- RLS: any authenticated user can read taxonomy; only service role writes
ALTER TABLE document_type_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_type_definitions_select_authenticated"
  ON document_type_definitions FOR SELECT
  TO authenticated
  USING (true);

-- ── PART C — Seed 14 food safety document categories ────────────────

INSERT INTO document_type_definitions (code, name, short_name, description, category, citation_authority, citation_section, edition_year, sort_order) VALUES
('PHP', 'Public Health Permit', 'Health Permit', 'Written authorization issued by the County Health Officer to operate a retail food facility. Required to be posted at facility.', 'food_safety', 'CalCode', '§114381', 2026, 10),
('CFPM', 'Certified Food Protection Manager Certificate', 'CFPM Cert', 'Certificate issued to designated person in charge demonstrating completion of accredited food protection manager training. One per facility minimum.', 'food_safety', 'CalCode', '§113947.1', 2026, 20),
('CFH', 'Certified Food Handler Card', 'Food Handler Card', 'Card issued to food handlers demonstrating completion of accredited food handler training. Required for each non-prepackaged food handler within 30 days of hire.', 'food_safety', 'CalCode', '§113947.2', 2026, 30),
('HACCP', 'HACCP Plan', 'HACCP Plan', 'Written Hazard Analysis Critical Control Point plan required for specialized processes including reduced-oxygen packaging, sous vide, par-cooking, and molluscan shellfish display tanks.', 'food_safety', 'CalCode', '§113980, §114417, §114419', 2026, 40),
('VAR', 'CDPH Variance Letter', 'Variance Letter', 'Written variance issued by California Department of Public Health authorizing deviation from specific code requirements. Must be kept on file at facility.', 'food_safety', 'CalCode', '§113936, §114417', 2026, 50),
('PEST', 'Pest Control Service Records', 'Pest Records', 'Service records from licensed pest control company including treatment dates, products used, and findings. Inspector requests proof of regular service.', 'food_safety', 'CalCode', '§114259.1', 2026, 60),
('GTSR', 'Grease Trap / Interceptor Service Records', 'Grease Trap Records', 'Pumping and servicing records for grease trap or interceptor. Frequency determined by facility load and local ordinance.', 'food_safety', 'CalCode', '§114197, §114201', 2026, 70),
('BFT', 'Backflow Prevention Device Test Certificate', 'Backflow Cert', 'Annual testing certificate from certified backflow tester. Required for backflow prevention devices protecting potable water supply.', 'food_safety', 'CalCode', '§114192(c)', 2026, 80),
('TLCH', 'Temperature Log - Cold Holding', 'Cold Hold Log', 'Records of cold-holding temperatures (≤41°F) for potentially hazardous foods. Required documentation for time/temperature compliance.', 'food_safety', 'CalCode', '§113996', 2026, 90),
('TLHH', 'Temperature Log - Hot Holding', 'Hot Hold Log', 'Records of hot-holding temperatures (≥135°F) for potentially hazardous foods. Required documentation for time/temperature compliance.', 'food_safety', 'CalCode', '§113996', 2026, 100),
('TPHC', 'Time as Public Health Control Records', 'TPHC Records', 'Written procedures and time-tracking records when using time (rather than temperature) as the public health control for potentially hazardous foods.', 'food_safety', 'CalCode', '§114000', 2026, 110),
('SANL', 'Sanitizer Concentration Log', 'Sanitizer Log', 'Records of sanitizer concentration checks at warewashing stations and wiping cloth buckets.', 'food_safety', 'CalCode', '§114099, §114105', 2026, 120),
('RECL', 'Food Recall / Traceability Records', 'Recall Records', 'Records sufficient to match food product lots to suppliers and customers. Retained for not less than 90 days from date of sale.', 'food_safety', 'CalCode', '§114039.5', 2026, 130),
('PLNC', 'Plan Check Approval', 'Plan Check', 'Plan check approval documentation from local enforcement agency for new construction, remodel, or new equipment installation.', 'food_safety', 'CalCode', '§114380', 2026, 140);

-- ── PART D — Apply-time verification block (Rule #14) ───────────────

DO $$
DECLARE
  v_constraint_exists boolean;
  v_table_exists boolean;
  v_seed_count integer;
  v_food_safety_count integer;
BEGIN
  -- Verify CHECK constraint on service_type_definitions.category
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'service_type_definitions_category_check'
  ) INTO v_constraint_exists;
  IF NOT v_constraint_exists THEN
    RAISE EXCEPTION 'C4.5 verification failed: service_type_definitions_category_check constraint missing';
  END IF;

  -- Verify document_type_definitions table created
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'document_type_definitions'
  ) INTO v_table_exists;
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'C4.5 verification failed: document_type_definitions table not created';
  END IF;

  -- Verify 14 seed rows inserted
  SELECT COUNT(*) FROM document_type_definitions INTO v_seed_count;
  IF v_seed_count <> 14 THEN
    RAISE EXCEPTION 'C4.5 verification failed: expected 14 seed rows, found %', v_seed_count;
  END IF;

  -- Verify all 14 are food_safety
  SELECT COUNT(*) FROM document_type_definitions WHERE category = 'food_safety' INTO v_food_safety_count;
  IF v_food_safety_count <> 14 THEN
    RAISE EXCEPTION 'C4.5 verification failed: expected 14 food_safety rows, found %', v_food_safety_count;
  END IF;

  RAISE NOTICE 'C4.5 verification passed: CHECK constraint added, document_type_definitions created with 14 food_safety seed rows';
END $$;
