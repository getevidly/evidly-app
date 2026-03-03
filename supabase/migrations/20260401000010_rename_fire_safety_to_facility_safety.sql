-- ============================================================================
-- Migration: Rename fire_safety → facility_safety (pillar rename)
-- ============================================================================
-- Renames the compliance pillar from "fire_safety" to "facility_safety"
-- across all tables storing pillar references.
--
-- DOES NOT rename fire-specific columns:
--   fire_ahj_name, fire_ahj_type, fire_code_edition, nfpa96_edition (jurisdictions)
--   fire_score (insurance_score_history) — refers to fire risk, not the pillar
--   factor_category = 'fire' (insurance_risk_factors) — specific fire risk category
-- ============================================================================

BEGIN;

-- ─── 1. Rename columns ────────────────────────────────────────────────────

-- enterprise_rollup_scores: fire_safety_score → facility_safety_score
ALTER TABLE IF EXISTS enterprise_rollup_scores
  RENAME COLUMN fire_safety_score TO facility_safety_score;

-- compliance_score_snapshots: fire_safety_score → facility_safety_score
ALTER TABLE IF EXISTS compliance_score_snapshots
  RENAME COLUMN fire_safety_score TO facility_safety_score;

-- benchmark_aggregates: avg_fire_safety → avg_facility_safety
ALTER TABLE IF EXISTS benchmark_aggregates
  RENAME COLUMN avg_fire_safety TO avg_facility_safety;

-- jurisdictions: fire_safety_weight → facility_safety_weight
ALTER TABLE IF EXISTS jurisdictions
  RENAME COLUMN fire_safety_weight TO facility_safety_weight;

-- ─── 2. Update column defaults ────────────────────────────────────────────

-- equipment.compliance_pillar default
ALTER TABLE IF EXISTS equipment
  ALTER COLUMN compliance_pillar SET DEFAULT 'facility_safety';

-- equipment.pillar default (added by daily_checklists migration)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'equipment' AND column_name = 'pillar') THEN
    ALTER TABLE equipment ALTER COLUMN pillar SET DEFAULT 'facility_safety';
  END IF;
END $$;

-- ─── 3. Update stored data values ────────────────────────────────────────

-- equipment
UPDATE equipment SET compliance_pillar = 'facility_safety' WHERE compliance_pillar = 'fire_safety';
UPDATE equipment SET pillar = 'facility_safety' WHERE pillar = 'fire_safety';

-- checklist_templates
UPDATE checklist_templates SET pillar = 'facility_safety' WHERE pillar = 'fire_safety';

-- checklist_template_items
UPDATE checklist_template_items SET pillar = 'facility_safety' WHERE pillar = 'fire_safety';

-- intelligence_subscriptions
UPDATE intelligence_subscriptions SET pillar_focus = 'facility_safety' WHERE pillar_focus = 'fire_safety';

-- intelligence_insights — affected_pillars is TEXT[]
UPDATE intelligence_insights
  SET affected_pillars = array_replace(affected_pillars, 'fire_safety', 'facility_safety')
  WHERE 'fire_safety' = ANY(affected_pillars);

-- training_courses
UPDATE training_courses SET category = 'facility_safety' WHERE category = 'fire_safety';

-- training_certificates
UPDATE training_certificates SET certificate_type = 'facility_safety' WHERE certificate_type = 'fire_safety';

-- insurance_reports
UPDATE insurance_reports SET report_type = 'facility_safety' WHERE report_type = 'fire_safety';

-- location_jurisdictions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'location_jurisdictions' AND column_name = 'jurisdiction_layer') THEN
    UPDATE location_jurisdictions SET jurisdiction_layer = 'facility_safety' WHERE jurisdiction_layer = 'fire_safety';
  END IF;
END $$;

-- score_model_versions — update JSONB pillar_weights key
UPDATE score_model_versions
  SET pillar_weights = pillar_weights - 'fire_safety' || jsonb_build_object('facility_safety', pillar_weights->'fire_safety')
  WHERE pillar_weights ? 'fire_safety';

-- documents — update any pillar/category column
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'documents' AND column_name = 'pillar') THEN
    UPDATE documents SET pillar = 'facility_safety' WHERE pillar = 'fire_safety';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'documents' AND column_name = 'category') THEN
    UPDATE documents SET category = 'facility_safety' WHERE category = 'fire_safety';
  END IF;
END $$;

-- ─── 4. Update CHECK constraints ─────────────────────────────────────────

-- intelligence_subscriptions.pillar_focus
ALTER TABLE IF EXISTS intelligence_subscriptions DROP CONSTRAINT IF EXISTS intelligence_subscriptions_pillar_focus_check;
ALTER TABLE IF EXISTS intelligence_subscriptions
  ADD CONSTRAINT intelligence_subscriptions_pillar_focus_check
  CHECK (pillar_focus IN ('food_safety','facility_safety','both'));

-- training_courses.category
ALTER TABLE IF EXISTS training_courses DROP CONSTRAINT IF EXISTS training_courses_category_check;
ALTER TABLE IF EXISTS training_courses
  ADD CONSTRAINT training_courses_category_check
  CHECK (category IN ('food_safety_handler','food_safety_manager','facility_safety','compliance_ops','custom'));

-- training_certificates.certificate_type
ALTER TABLE IF EXISTS training_certificates DROP CONSTRAINT IF EXISTS training_certificates_certificate_type_check;
ALTER TABLE IF EXISTS training_certificates
  ADD CONSTRAINT training_certificates_certificate_type_check
  CHECK (certificate_type IN ('food_handler','food_manager_prep','facility_safety','custom'));

-- insurance_reports.report_type
ALTER TABLE IF EXISTS insurance_reports DROP CONSTRAINT IF EXISTS insurance_reports_report_type_check;
ALTER TABLE IF EXISTS insurance_reports
  ADD CONSTRAINT insurance_reports_report_type_check
  CHECK (report_type IN ('risk_profile', 'factor_breakdown', 'incident_summary', 'facility_safety'));

-- ─── 5. Update trigger function referencing fire_safety_score ─────────────

-- Recreate the immutability trigger if it references fire_safety_score
CREATE OR REPLACE FUNCTION prevent_snapshot_score_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.food_safety_score IS DISTINCT FROM NEW.food_safety_score
     OR OLD.facility_safety_score IS DISTINCT FROM NEW.facility_safety_score THEN
    RAISE EXCEPTION 'Compliance score snapshots are immutable after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
