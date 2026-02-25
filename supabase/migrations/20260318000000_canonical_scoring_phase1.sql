-- ============================================================
-- Phase 1: Canonical Scoring Stabilization
-- ============================================================
-- Fixes V14 (dead compliance_score_snapshots), V2 (no model
-- versioning), V12 (no FK chain from derived tables).
--
-- All changes are ADDITIVE — no drops, no renames, no data loss.
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- 1a) COMPLIANCE_SCORE_SNAPSHOTS — add versioning columns
-- ═══════════════════════════════════════════════════════════

ALTER TABLE compliance_score_snapshots
  ADD COLUMN IF NOT EXISTS model_version TEXT NOT NULL DEFAULT '1.0';

ALTER TABLE compliance_score_snapshots
  ADD COLUMN IF NOT EXISTS scoring_engine TEXT NOT NULL DEFAULT 'calculate-compliance-score';

ALTER TABLE compliance_score_snapshots
  ADD COLUMN IF NOT EXISTS inputs_hash TEXT;

-- ═══════════════════════════════════════════════════════════
-- 1b) SCORE_MODEL_VERSIONS — version registry
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS score_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  engine TEXT NOT NULL DEFAULT 'calculate-compliance-score',
  description TEXT,
  pillar_weights JSONB NOT NULL DEFAULT '{"food_safety": 0.5, "fire_safety": 0.5}',
  scoring_algorithm TEXT NOT NULL DEFAULT 'calcode_deduction',
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deprecated_at TIMESTAMPTZ,
  created_by TEXT
);

-- Seed v1.0
INSERT INTO score_model_versions (version, description, pillar_weights, scoring_algorithm)
VALUES (
  '1.0',
  'CalCode deduction model — 2-pillar (Food Safety + Fire Safety), jurisdiction-weighted. Most-restrictive jurisdiction wins.',
  '{"food_safety": 0.6, "fire_safety": 0.4}',
  'calcode_deduction'
)
ON CONFLICT (version) DO NOTHING;

-- RLS
ALTER TABLE score_model_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "smv_read_all" ON score_model_versions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "smv_service_write" ON score_model_versions
  FOR ALL TO service_role
  USING (true);

-- ═══════════════════════════════════════════════════════════
-- 1c) SCORE_CALCULATIONS — add FK to snapshot
-- ═══════════════════════════════════════════════════════════

ALTER TABLE score_calculations
  ADD COLUMN IF NOT EXISTS snapshot_id UUID REFERENCES compliance_score_snapshots(id);

CREATE INDEX IF NOT EXISTS idx_score_calc_snapshot
  ON score_calculations(snapshot_id);

-- ═══════════════════════════════════════════════════════════
-- 1d) DERIVED TABLES — add score_snapshot_id FK (all nullable)
-- ═══════════════════════════════════════════════════════════

-- insurance_risk_scores
ALTER TABLE insurance_risk_scores
  ADD COLUMN IF NOT EXISTS score_snapshot_id UUID REFERENCES compliance_score_snapshots(id);

CREATE INDEX IF NOT EXISTS idx_ins_risk_snapshot
  ON insurance_risk_scores(score_snapshot_id);

-- location_jurisdiction_scores
ALTER TABLE location_jurisdiction_scores
  ADD COLUMN IF NOT EXISTS score_snapshot_id UUID REFERENCES compliance_score_snapshots(id);

CREATE INDEX IF NOT EXISTS idx_loc_jurisdiction_snapshot
  ON location_jurisdiction_scores(score_snapshot_id);

-- location_benchmark_ranks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_benchmark_ranks') THEN
    ALTER TABLE location_benchmark_ranks
      ADD COLUMN IF NOT EXISTS score_snapshot_id UUID REFERENCES compliance_score_snapshots(id);
    CREATE INDEX IF NOT EXISTS idx_benchmark_ranks_snapshot
      ON location_benchmark_ranks(score_snapshot_id);
  END IF;
END $$;

-- location_compliance_scores (sensor aggregate — may not exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_compliance_scores') THEN
    ALTER TABLE location_compliance_scores
      ADD COLUMN IF NOT EXISTS score_snapshot_id UUID REFERENCES compliance_score_snapshots(id);
    CREATE INDEX IF NOT EXISTS idx_loc_compliance_snapshot
      ON location_compliance_scores(score_snapshot_id);
  END IF;
END $$;

-- enterprise_rollup_scores
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enterprise_rollup_scores') THEN
    ALTER TABLE enterprise_rollup_scores
      ADD COLUMN IF NOT EXISTS score_snapshot_id UUID REFERENCES compliance_score_snapshots(id);
    CREATE INDEX IF NOT EXISTS idx_enterprise_rollup_snapshot
      ON enterprise_rollup_scores(score_snapshot_id);
  END IF;
END $$;
