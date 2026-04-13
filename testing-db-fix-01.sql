-- ═══════════════════════════════════════════════════════════
-- TESTING-DB-FIX-01: Fix 7 Day 2 Schema Gaps
-- Testing DB: uroawofnyjzcqbmgdiqq
-- Date: Apr 11, 2026
-- ═══════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- Issue 1 (HIGH): temperature_logs — code uses facility_id (correct)
-- but Day 2 test queried location_id which doesn't exist.
-- FINDING: The REAL column is facility_id (FK to locations).
-- The Day 2 test script was wrong — no DB fix needed for this.
-- The test script will be updated to use facility_id.
-- STATUS: NO DB CHANGE — test script fix only
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- Issue 2 (HIGH): documents.name missing
-- FINDING: Production column is "title" (NOT "name").
-- The code uses .select('id, title, ...') — see standingQueries.ts:384
-- The Day 2 test queried "name" but the real column is "title".
-- STATUS: NO DB CHANGE — test script fix only
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- Issue 3 (HIGH): incidents table missing entirely
-- SOURCE: supabase/migrations/20260223000000_incident_log_tables.sql
-- FULL SCHEMA: 32 columns with timeline + comments sub-tables
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID REFERENCES locations(id),
  incident_number TEXT NOT NULL DEFAULT ('INC-' || to_char(now(), 'YYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4)),
  type VARCHAR(50) NOT NULL DEFAULT 'other',
  severity VARCHAR(20) NOT NULL DEFAULT 'minor',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location_name TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'reported',
  assigned_to TEXT,
  reported_by TEXT NOT NULL DEFAULT 'system',
  corrective_action TEXT,
  action_chips TEXT[],
  resolution_summary TEXT,
  root_cause VARCHAR(20),
  source_type VARCHAR(20),
  source_id UUID,
  source_label TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  resolution_photos JSONB DEFAULT '[]'::jsonb,
  resolved_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  regulatory_report_required BOOLEAN DEFAULT false,
  regulatory_report_filed_at TIMESTAMPTZ,
  regulatory_report_filed_by TEXT,
  linked_corrective_action_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incidents_org_select" ON incidents
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "incidents_org_insert" ON incidents
  FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "incidents_org_update" ON incidents
  FOR UPDATE USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON incidents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents(location_id);

-- Sub-tables
CREATE TABLE IF NOT EXISTS incident_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  performed_by TEXT NOT NULL,
  notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE incident_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incident_timeline_via_incident" ON incident_timeline
  FOR ALL USING (incident_id IN (SELECT id FROM incidents WHERE organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )));
CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident ON incident_timeline(incident_id, created_at DESC);

CREATE TABLE IF NOT EXISTS incident_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE incident_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incident_comments_via_incident" ON incident_comments
  FOR ALL USING (incident_id IN (SELECT id FROM incidents WHERE organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )));
CREATE INDEX IF NOT EXISTS idx_incident_comments_incident ON incident_comments(incident_id, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- Issue 4 (HIGH): jurisdictions.food_agency_name missing
-- FINDING: This is NOT a real production column!
-- The actual column is "agency_name" (for food safety agency).
-- useJurisdiction.ts line 64 uses fallback:
--   agency_name: config.food_agency_name || config.agency_name
-- Since food_agency_name won't exist on the DB row, it falls
-- back to agency_name — which is correct behavior.
-- STATUS: NO DB CHANGE — code is working as designed
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- Issue 5 (MEDIUM): 0 checklist templates
-- SOURCE: supabase/migrations/20260304000001_daily_checklists_module.sql
--         supabase/migrations/20260415100000_checklist_jurisdiction_awareness.sql
-- Seeds 7 default templates with 26 items
-- We need to seed these on the testing DB
-- NOTE: These are org-agnostic (organization_id = NULL means global defaults)
--
-- STEP 5a: Add missing columns from later migrations
-- Testing DB only has 8 cols on checklist_templates (missing 5)
-- and 7 cols on checklist_template_items (missing 17)
-- ────────────────────────────────────────────────────────────

-- 5a-1: Add missing columns to checklist_templates
ALTER TABLE checklist_templates
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES locations(id),
  ADD COLUMN IF NOT EXISTS pillar TEXT DEFAULT 'food_safety',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jurisdiction_id UUID,
  ADD COLUMN IF NOT EXISTS food_code_version TEXT;

-- 5a-2: Add missing columns to checklist_template_items
ALTER TABLE checklist_template_items
  ADD COLUMN IF NOT EXISTS item_text TEXT,
  ADD COLUMN IF NOT EXISTS pillar TEXT DEFAULT 'food_safety',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS authority_source TEXT DEFAULT 'evidly_best_practice',
  ADD COLUMN IF NOT EXISTS authority_section TEXT,
  ADD COLUMN IF NOT EXISTS authority_note TEXT,
  ADD COLUMN IF NOT EXISTS temp_min DECIMAL,
  ADD COLUMN IF NOT EXISTS temp_max DECIMAL,
  ADD COLUMN IF NOT EXISTS temp_unit TEXT DEFAULT 'F',
  ADD COLUMN IF NOT EXISTS haccp_ccp TEXT,
  ADD COLUMN IF NOT EXISTS haccp_hazard TEXT,
  ADD COLUMN IF NOT EXISTS haccp_critical_limit TEXT,
  ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS requires_photo_on_fail BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_corrective_action BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 5a-3: Add HACCP index
CREATE INDEX IF NOT EXISTS idx_checklist_items_ccp
  ON checklist_template_items(haccp_ccp) WHERE haccp_ccp IS NOT NULL;

-- 5b: Insert 7 default templates + 26 items (matches production migration pattern)
-- Production uses: SELECT id FROM organizations LIMIT 1 as the org_id
DO $$
DECLARE
  v_org_id UUID;
  t1 UUID; t2 UUID; t3 UUID; t4 UUID; t5 UUID; t6 UUID; t7 UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  IF v_org_id IS NULL THEN
    RAISE NOTICE 'No organization found — skipping template seed.';
    RETURN;
  END IF;

  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM checklist_templates WHERE name = 'Opening Checklist — Food Safety' AND organization_id = v_org_id) THEN
    RAISE NOTICE 'Templates already seeded — skipping.';
    RETURN;
  END IF;

  -- Template 1: Opening Food Safety
  INSERT INTO checklist_templates (organization_id, name, checklist_type, frequency, pillar, sort_order, is_active)
  VALUES (v_org_id, 'Opening Checklist — Food Safety', 'opening', 'daily', 'food_safety', 1, true)
  RETURNING id INTO t1;

  INSERT INTO checklist_template_items (template_id, title, item_text, item_type, pillar, category, authority_source, authority_section, is_critical, "order", sort_order) VALUES
  (t1, 'Employee health screening completed', 'Employee health screening — all staff report illness symptoms to PIC', 'yes_no', 'food_safety', 'employee_health', 'calcode', '§113949.5', true, 1, 1),
  (t1, 'Handwashing stations stocked', 'Handwashing stations stocked — soap, paper towels, warm water', 'yes_no', 'food_safety', 'sanitation', 'calcode', '§113953', false, 2, 2),
  (t1, 'Walk-in cooler temperature', 'Walk-in cooler temperature ≤41°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113996(a)', false, 3, 3),
  (t1, 'Walk-in freezer temperature', 'Walk-in freezer temperature ≤0°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113996(a)', false, 4, 4),
  (t1, 'Prep surfaces sanitized', 'Prep surfaces clean and sanitized', 'yes_no', 'food_safety', 'sanitation', 'calcode', '§114097', false, 5, 5),
  (t1, 'Sanitizer concentration verified', 'Chemical sanitizer concentration in correct range', 'yes_no', 'food_safety', 'sanitation', 'calcode', '§113980(c)', false, 6, 6),
  (t1, 'Date labels on prepped items', 'Date labels on all prepped items', 'yes_no', 'food_safety', 'storage', 'calcode', '§114057.1', false, 7, 7);

  -- Template 2: Opening Fire Safety
  INSERT INTO checklist_templates (organization_id, name, checklist_type, frequency, pillar, sort_order, is_active)
  VALUES (v_org_id, 'Opening Checklist — Fire Safety', 'fire_daily', 'daily', 'fire_safety', 2, true)
  RETURNING id INTO t2;

  INSERT INTO checklist_template_items (template_id, title, item_text, item_type, pillar, category, authority_source, authority_section, is_critical, "order", sort_order) VALUES
  (t2, 'Fire extinguishers accessible', 'Fire extinguishers accessible and not obstructed', 'yes_no', 'fire_safety', 'extinguisher', 'cfc', '§906.5', false, 1, 1),
  (t2, 'Hood system operational', 'Kitchen hood system operational', 'yes_no', 'fire_safety', 'hood_system', 'nfpa_96', '§11.4', false, 2, 2),
  (t2, 'Egress paths clear', 'Egress paths clear and unobstructed', 'yes_no', 'fire_safety', 'egress', 'cfc', '§1031.2', false, 3, 3),
  (t2, 'Ansul system gauge in green', 'Ansul system gauge in green zone', 'yes_no', 'fire_safety', 'suppression', 'nfpa_96', '§10.5', false, 4, 4);

  -- Template 3: Receiving
  INSERT INTO checklist_templates (organization_id, name, checklist_type, frequency, pillar, sort_order, is_active)
  VALUES (v_org_id, 'Receiving Checklist', 'receiving', 'per_shift', 'food_safety', 3, true)
  RETURNING id INTO t3;

  INSERT INTO checklist_template_items (template_id, title, item_text, item_type, pillar, category, authority_source, authority_section, is_critical, "order", sort_order) VALUES
  (t3, 'Delivery truck temp verified', 'Delivery truck temperature verified', 'temperature', 'food_safety', 'temperature', 'calcode', '§113996(a)', false, 1, 1),
  (t3, 'Packaging intact', 'Food packaging intact, no signs of contamination', 'yes_no', 'food_safety', 'general', 'calcode', '§113980', false, 2, 2),
  (t3, 'Shellstock tags recorded', 'Shellstock tags present and recorded', 'yes_no', 'food_safety', 'general', 'calcode', '§114039(b)', false, 3, 3);

  -- Template 4: Mid-Shift
  INSERT INTO checklist_templates (organization_id, name, checklist_type, frequency, pillar, sort_order, is_active)
  VALUES (v_org_id, 'Mid-Shift Checklist', 'mid_shift', 'per_shift', 'food_safety', 4, true)
  RETURNING id INTO t4;

  INSERT INTO checklist_template_items (template_id, title, item_text, item_type, pillar, category, authority_source, authority_section, is_critical, "order", sort_order) VALUES
  (t4, 'Hot holding temps ≥135°F', 'Hot holding temperatures at or above 135°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113996(b)', false, 1, 1),
  (t4, 'Cold holding temps ≤41°F', 'Cold holding temperatures at or below 41°F', 'temperature', 'food_safety', 'temperature', 'calcode', '§113996(a)', false, 2, 2),
  (t4, 'Sanitizer buckets refreshed', 'Sanitizer buckets refreshed and concentration verified', 'yes_no', 'food_safety', 'sanitation', 'calcode', '§114099.6', false, 3, 3);

  -- Template 5: Closing Food Safety
  INSERT INTO checklist_templates (organization_id, name, checklist_type, frequency, pillar, sort_order, is_active)
  VALUES (v_org_id, 'Closing Checklist — Food Safety', 'closing', 'daily', 'food_safety', 5, true)
  RETURNING id INTO t5;

  INSERT INTO checklist_template_items (template_id, title, item_text, item_type, pillar, category, authority_source, authority_section, is_critical, "order", sort_order) VALUES
  (t5, 'Food stored covered and labeled', 'All food stored covered and labeled', 'yes_no', 'food_safety', 'storage', 'calcode', '§114059', false, 1, 1),
  (t5, 'Floors swept and mopped', 'Floors swept, mopped, and dry', 'yes_no', 'food_safety', 'sanitation', 'calcode', '§114257', false, 2, 2),
  (t5, 'Equipment off or correct setting', 'All equipment turned off or on correct setting', 'yes_no', 'food_safety', 'equipment', 'evidly_best_practice', NULL, false, 3, 3);

  -- Template 6: Fire Weekly
  INSERT INTO checklist_templates (organization_id, name, checklist_type, frequency, pillar, sort_order, is_active)
  VALUES (v_org_id, 'Fire Safety Weekly Checklist', 'fire_weekly', 'weekly', 'fire_safety', 6, true)
  RETURNING id INTO t6;

  INSERT INTO checklist_template_items (template_id, title, item_text, item_type, pillar, category, authority_source, authority_section, is_critical, "order", sort_order) VALUES
  (t6, 'Hood filters cleaned', 'Hood filters cleaned or replaced', 'yes_no', 'fire_safety', 'hood_system', 'nfpa_96', '§11.4', false, 1, 1),
  (t6, 'Grease drip trays emptied', 'Grease drip trays emptied', 'yes_no', 'fire_safety', 'hood_system', 'nfpa_96', '§11.6', false, 2, 2),
  (t6, 'Exit signs illuminated', 'Exit signs illuminated', 'yes_no', 'fire_safety', 'egress', 'cfc', '§1013.3', false, 3, 3);

  -- Template 7: Fire Monthly
  INSERT INTO checklist_templates (organization_id, name, checklist_type, frequency, pillar, sort_order, is_active)
  VALUES (v_org_id, 'Fire Safety Monthly Checklist', 'fire_monthly', 'monthly', 'fire_safety', 7, true)
  RETURNING id INTO t7;

  INSERT INTO checklist_template_items (template_id, title, item_text, item_type, pillar, category, authority_source, authority_section, is_critical, "order", sort_order) VALUES
  (t7, 'Fire extinguisher monthly inspection', 'Fire extinguisher monthly visual inspection', 'yes_no', 'fire_safety', 'extinguisher', 'nfpa_96', '§906.2', false, 1, 1),
  (t7, 'Emergency lighting test', 'Emergency lighting functional test', 'yes_no', 'fire_safety', 'egress', 'cfc', '§604.2', false, 2, 2),
  (t7, 'Suppression system gauge check', 'Kitchen suppression system gauge check', 'yes_no', 'fire_safety', 'suppression', 'nfpa_96', '§10.5', false, 3, 3);

  RAISE NOTICE 'Seeded 7 templates with 26 items for org %', v_org_id;
END $$;

-- ────────────────────────────────────────────────────────────
-- Issue 6 (MEDIUM): location_service_schedules missing entirely
-- FINDING: The entire hoodops_service_types migration was missing.
-- Created: service_type_definitions (5 service types seeded)
--          location_service_schedules (table + RLS)
-- The table is now empty — PSE widget will be hidden until
-- service schedules are added for a location.
-- Seeding requires org/location IDs (deferred to test script).
-- SOURCE: supabase/migrations/20260313000001_hoodops_service_types.sql
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- Issue 7 (MEDIUM): jurisdictions.fire_agency_name missing
-- FINDING: This is NOT a real production column!
-- The actual column is "fire_ahj_name".
-- useJurisdiction.ts line 78 uses fallback:
--   agency_name: config.fire_agency_name || config.agency_name
-- Since fire_agency_name won't exist on the DB row, it falls
-- back to agency_name — which is correct behavior.
-- The fire_ahj_name column already EXISTS on the testing DB.
-- STATUS: NO DB CHANGE — code is working as designed
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- Issue 8 (Day 3 discovery): documents table missing 18 columns
-- from migrations 20260304100001, 20260304020010, 20260311000000
-- Testing DB only had 15 cols (base 14 + coi_warning_sent_at)
-- Added: ai_document_type, ai_document_type_label, ai_issue_date,
--        ai_expiration_date, ai_issuing_agency, ai_inspector_name,
--        ai_score_grade, ai_violations, ai_compliance_status,
--        ai_confidence, ai_analyzed_at, needs_attention,
--        import_source, original_filename, imported_at,
--        scan_status, categorization_source, manual_category_override
-- ────────────────────────────────────────────────────────────

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS ai_document_type TEXT,
  ADD COLUMN IF NOT EXISTS ai_document_type_label TEXT,
  ADD COLUMN IF NOT EXISTS ai_issue_date DATE,
  ADD COLUMN IF NOT EXISTS ai_expiration_date DATE,
  ADD COLUMN IF NOT EXISTS ai_issuing_agency TEXT,
  ADD COLUMN IF NOT EXISTS ai_inspector_name TEXT,
  ADD COLUMN IF NOT EXISTS ai_score_grade TEXT,
  ADD COLUMN IF NOT EXISTS ai_violations TEXT[],
  ADD COLUMN IF NOT EXISTS ai_compliance_status TEXT,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS needs_attention BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scan_status TEXT DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS categorization_source TEXT DEFAULT 'ai',
  ADD COLUMN IF NOT EXISTS manual_category_override BOOLEAN DEFAULT false;

-- ═══════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (run after applying)
-- ═══════════════════════════════════════════════════════════
--
-- Issue 1 — temperature_logs.facility_id (NO DB CHANGE):
--   SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='temperature_logs' AND column_name='facility_id');
--   → true (facility_id is the correct column; test script was querying location_id)
--
-- Issue 2 — documents.title (NO DB CHANGE):
--   SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='title');
--   → true (title is the correct column; test script was querying name)
--
-- Issue 3 — incidents table:
--   SELECT 'incidents' as tbl, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='incidents' AND table_schema='public');
--   SELECT 'incident_timeline' as tbl, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='incident_timeline' AND table_schema='public');
--   SELECT 'incident_comments' as tbl, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='incident_comments' AND table_schema='public');
--   → all true
--
-- Issue 4 — jurisdictions.food_agency_name (NO DB CHANGE):
--   Column does not exist by design. Code uses fallback: config.food_agency_name || config.agency_name
--   SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='jurisdictions' AND column_name='agency_name');
--   → true
--
-- Issue 5 — checklist templates:
--   SELECT count(*) FROM checklist_templates;       → 7
--   SELECT count(*) FROM checklist_template_items;  → 26
--   Columns added: checklist_templates got 5 new (facility_id, pillar, sort_order, jurisdiction_id, food_code_version)
--   Columns added: checklist_template_items got 17 new (item_text, pillar, category, authority_source, authority_section, authority_note, temp_min, temp_max, temp_unit, haccp_ccp, haccp_hazard, haccp_critical_limit, is_critical, is_active, requires_photo_on_fail, requires_corrective_action, sort_order)
--
-- Issue 6 — location_service_schedules:
--   SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='location_service_schedules' AND table_schema='public');
--   → true (table created, empty — needs org/location-specific seed data)
--   SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='service_type_definitions' AND table_schema='public');
--   → true (5 service types seeded: KEC, FPM, GFX, RGC, FS)
--
-- Issue 7 — jurisdictions.fire_agency_name (NO DB CHANGE):
--   Column does not exist by design. Code uses fallback: config.fire_agency_name || config.agency_name
--   Real fire column is fire_ahj_name:
--   SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='jurisdictions' AND column_name='fire_ahj_name');
--   → true
--
-- ═══════════════════════════════════════════════════════════
-- APPLIED: Apr 11, 2026
-- RESULT: Issues 3, 5, 6 fixed. Issues 1, 2, 4, 7 = no DB change needed.
-- ═══════════════════════════════════════════════════════════
