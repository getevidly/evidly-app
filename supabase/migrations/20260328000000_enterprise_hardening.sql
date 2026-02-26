-- ═══════════════════════════════════════════════════════════════════════
-- ENTERPRISE HARDENING — Phase 6: Column renames, drops, immutability
-- Final phase of 6-phase architecture stabilization plan
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 1. Rename enterprise_rollup_scores columns to match canonical 2-pillar model ═══
-- Old 3-pillar: operational_score, equipment_score, documentation_score
-- New 2-pillar: food_safety_score, fire_safety_score (matching compliance_score_snapshots)
ALTER TABLE enterprise_rollup_scores
  RENAME COLUMN equipment_score TO fire_safety_score;

ALTER TABLE enterprise_rollup_scores
  RENAME COLUMN documentation_score TO food_safety_score;

-- Drop operational_score — not referenced by any edge function code
ALTER TABLE enterprise_rollup_scores
  DROP COLUMN IF EXISTS operational_score;

-- ═══ 2. Drop stale organization weight columns ═══
-- These were part of the old 3-pillar weighting system.
-- Modern scoring uses score_model_versions table with JSONB pillar weights.
-- Confirmed 0 code references across entire codebase.
ALTER TABLE organizations
  DROP COLUMN IF EXISTS operational_weight,
  DROP COLUMN IF EXISTS equipment_weight,
  DROP COLUMN IF EXISTS documentation_weight;

-- ═══ 3. Immutability trigger on compliance_score_snapshots ═══
-- Snapshots are the canonical source of truth for the audit chain:
--   score_calculations → compliance_score_snapshots → risk_assessments → reports
-- Once a snapshot is created, its scores must NEVER be modified.
-- Non-score metadata (model_version, inputs_hash, scoring_engine) can still be updated.

CREATE OR REPLACE FUNCTION prevent_snapshot_score_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.overall_score IS DISTINCT FROM NEW.overall_score
     OR OLD.food_safety_score IS DISTINCT FROM NEW.food_safety_score
     OR OLD.fire_safety_score IS DISTINCT FROM NEW.fire_safety_score
     OR OLD.vendor_score IS DISTINCT FROM NEW.vendor_score
  THEN
    RAISE EXCEPTION 'compliance_score_snapshots scores are immutable. Create a new snapshot instead of updating.';
  END IF;
  -- Allow updating non-score metadata (model_version, inputs_hash, etc.)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_snapshot_immutability
  BEFORE UPDATE ON compliance_score_snapshots
  FOR EACH ROW EXECUTE FUNCTION prevent_snapshot_score_update();
