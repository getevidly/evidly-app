-- ============================================================
-- Compliance Benchmarking Index — Task #50 (Roadmap #10)
-- ============================================================
-- Daily score snapshots + computed benchmark aggregates
-- for percentile ranking and industry comparison.
-- ============================================================

-- ── Daily Score Snapshots per Location ────────────────────────

CREATE TABLE IF NOT EXISTS compliance_score_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  location_id UUID NOT NULL,
  score_date DATE NOT NULL,
  overall_score REAL NOT NULL,
  food_safety_score REAL,
  fire_safety_score REAL,
  vendor_score REAL,
  -- Granular operational metrics
  temp_readings_count INTEGER DEFAULT 0,
  temp_in_range_pct REAL,
  checklists_completed_pct REAL,
  incidents_open INTEGER DEFAULT 0,
  incidents_avg_resolution_hours REAL,
  documents_current_pct REAL,
  photo_evidence_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(location_id, score_date)
);

CREATE INDEX IF NOT EXISTS idx_score_snap_date ON compliance_score_snapshots(score_date, location_id);
CREATE INDEX IF NOT EXISTS idx_score_snap_org ON compliance_score_snapshots(organization_id);

-- ── Benchmark Aggregates (computed periodically) ─────────────

CREATE TABLE IF NOT EXISTS benchmark_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,               -- 'weekly', 'monthly', 'quarterly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  segment TEXT NOT NULL,              -- 'all', 'casual_dining', 'quick_service', 'hotel', etc.
  state_code TEXT,                    -- NULL = national, 'CA' = state-level

  -- Aggregate statistics
  location_count INTEGER NOT NULL,
  avg_score REAL NOT NULL,
  median_score REAL NOT NULL,
  p25_score REAL,
  p75_score REAL,
  p90_score REAL,
  min_score REAL,
  max_score REAL,
  std_deviation REAL,

  -- Pillar averages
  avg_food_safety REAL,
  avg_fire_safety REAL,
  avg_vendor REAL,

  -- Operational metrics averages
  avg_temp_compliance_pct REAL,
  avg_checklist_completion_pct REAL,
  avg_incident_resolution_hours REAL,
  avg_photo_evidence_per_day REAL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(period, period_start, segment, state_code)
);

CREATE INDEX IF NOT EXISTS idx_bench_agg_period ON benchmark_aggregates(period, period_start);
CREATE INDEX IF NOT EXISTS idx_bench_agg_segment ON benchmark_aggregates(segment, state_code);

-- ── Industry Segment on Locations ─────────────────────────────

ALTER TABLE locations ADD COLUMN IF NOT EXISTS industry_segment TEXT DEFAULT 'other';
-- Values: 'casual_dining', 'quick_service', 'fine_dining', 'hotel',
--         'education_k12', 'education_university', 'healthcare',
--         'corporate_dining', 'catering', 'food_truck',
--         'grocery_deli', 'convenience', 'other'

-- ── RLS Policies ────────────────────────────────────────────

ALTER TABLE compliance_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_aggregates ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own organization's score snapshots
CREATE POLICY "css_org_access" ON compliance_score_snapshots
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Service role can write score snapshots (for edge functions)
CREATE POLICY "css_service_write" ON compliance_score_snapshots
  FOR ALL TO service_role
  USING (true);

-- Benchmark aggregates are readable by all authenticated (anonymized data)
CREATE POLICY "bench_agg_read" ON benchmark_aggregates
  FOR SELECT TO authenticated
  USING (true);

-- Service role can write benchmark aggregates
CREATE POLICY "bench_agg_service_write" ON benchmark_aggregates
  FOR ALL TO service_role
  USING (true);
