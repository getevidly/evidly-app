-- ═══════════════════════════════════════════════════════════════════════
-- ENTERPRISE HARDENING — Phase 6: Column renames, drops, immutability
-- Final phase of 6-phase architecture stabilization plan
-- All operations guarded for idempotency and missing-table safety
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 1. Rename enterprise_rollup_scores columns to match canonical 2-pillar model ═══
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enterprise_rollup_scores') THEN
    BEGIN
      ALTER TABLE enterprise_rollup_scores RENAME COLUMN equipment_score TO fire_safety_score;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
      ALTER TABLE enterprise_rollup_scores RENAME COLUMN documentation_score TO food_safety_score;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    ALTER TABLE enterprise_rollup_scores DROP COLUMN IF EXISTS operational_score;
  END IF;
END $$;

-- ═══ 2. Drop stale organization weight columns ═══
ALTER TABLE organizations
  DROP COLUMN IF EXISTS operational_weight,
  DROP COLUMN IF EXISTS equipment_weight,
  DROP COLUMN IF EXISTS documentation_weight;

-- ═══ 3. Immutability trigger on compliance_score_snapshots ═══
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_score_snapshots') THEN
    BEGIN
      CREATE TRIGGER enforce_snapshot_immutability
        BEFORE UPDATE ON compliance_score_snapshots
        FOR EACH ROW EXECUTE FUNCTION prevent_snapshot_score_update();
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
