-- ============================================================
-- GAP-02: Compliance Score Calculation Engine v2.0
-- ============================================================
-- Adds engine v2.0 columns to compliance_score_snapshots for
-- ops/docs sub-scores and jurisdiction overlay. Inserts v2.0
-- into score_model_versions.
-- ============================================================

-- ── Add engine v2.0 columns to compliance_score_snapshots ────

ALTER TABLE compliance_score_snapshots
  ADD COLUMN IF NOT EXISTS food_safety_ops_score REAL,
  ADD COLUMN IF NOT EXISTS food_safety_docs_score REAL,
  ADD COLUMN IF NOT EXISTS facility_safety_ops_score REAL,
  ADD COLUMN IF NOT EXISTS facility_safety_docs_score REAL,
  ADD COLUMN IF NOT EXISTS jurisdiction_score REAL,
  ADD COLUMN IF NOT EXISTS jurisdiction_grade TEXT,
  ADD COLUMN IF NOT EXISTS violation_details JSONB,
  ADD COLUMN IF NOT EXISTS engine_version TEXT DEFAULT '1.0';

-- ── Rename fire_safety_score → facility_safety_score if needed ──

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compliance_score_snapshots'
      AND column_name = 'fire_safety_score'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compliance_score_snapshots'
      AND column_name = 'facility_safety_score'
  ) THEN
    ALTER TABLE compliance_score_snapshots
      RENAME COLUMN fire_safety_score TO facility_safety_score;
  END IF;
END $$;

-- If fire_safety_score was already renamed or never existed, add facility_safety_score
ALTER TABLE compliance_score_snapshots
  ADD COLUMN IF NOT EXISTS facility_safety_score REAL;

-- ── Insert v2.0 model version ────────────────────────────────

INSERT INTO score_model_versions (version, engine, description, pillar_weights, scoring_algorithm)
VALUES (
  '2.0',
  'compliance-engine-v2',
  'Continuous scoring engine — ops/docs sub-scores per pillar, jurisdiction overlay. Food Safety (temp + checklists + HACCP + incidents + docs) + Facility Safety (hood + ansul + equipment + grease trap + docs).',
  '{"food_safety": 0.5, "facility_safety": 0.5}',
  'weighted_average'
)
ON CONFLICT (version) DO NOTHING;

-- ── Index for engine version filtering ───────────────────────

CREATE INDEX IF NOT EXISTS idx_score_snap_engine_version
  ON compliance_score_snapshots(engine_version);
