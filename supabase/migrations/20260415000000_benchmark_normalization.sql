-- ============================================================
-- GAP-05: Benchmark Normalization — Schema Extensions
-- ============================================================
-- Adds pillar-level percentiles, jurisdiction difficulty tracking,
-- and subcategory benchmark statistics for normalized comparisons.
-- ============================================================

-- ── Extend location_benchmark_ranks ──────────────────────────

ALTER TABLE location_benchmark_ranks
  ADD COLUMN IF NOT EXISTS food_safety_percentile INTEGER,
  ADD COLUMN IF NOT EXISTS facility_safety_percentile INTEGER,
  ADD COLUMN IF NOT EXISTS jurisdiction_difficulty REAL,
  ADD COLUMN IF NOT EXISTS adjusted_overall_percentile INTEGER;

COMMENT ON COLUMN location_benchmark_ranks.food_safety_percentile
  IS 'Rank-based percentile for food safety pillar against vertical peers';
COMMENT ON COLUMN location_benchmark_ranks.facility_safety_percentile
  IS 'Rank-based percentile for facility safety pillar against vertical peers';
COMMENT ON COLUMN location_benchmark_ranks.jurisdiction_difficulty
  IS 'Jurisdiction difficulty index 0.0-1.0 (higher = stricter county)';
COMMENT ON COLUMN location_benchmark_ranks.adjusted_overall_percentile
  IS 'Overall percentile adjusted for jurisdiction difficulty (max ±5 pts)';

-- ── Rename fire_safety_score → facility_safety_score ─────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compliance_score_snapshots'
      AND column_name = 'fire_safety_score'
  ) THEN
    ALTER TABLE compliance_score_snapshots
      RENAME COLUMN fire_safety_score TO facility_safety_score;
  END IF;
END $$;

-- ── Subcategory benchmark statistics ─────────────────────────
-- Stores aggregated peer statistics per subcategory for trend
-- tracking and peer group comparison.

CREATE TABLE IF NOT EXISTS benchmark_subcategory_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  vertical TEXT,
  county TEXT,
  subcategory_key TEXT NOT NULL,
  mean_score REAL NOT NULL,
  median_score REAL NOT NULL,
  std_dev REAL,
  p25 REAL,
  p75 REAL,
  p90 REAL,
  sample_size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benchmark_subcategory_stats_lookup
  ON benchmark_subcategory_stats (snapshot_date, subcategory_key, vertical, county);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE benchmark_subcategory_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read benchmark stats"
  ON benchmark_subcategory_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage benchmark stats"
  ON benchmark_subcategory_stats FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
