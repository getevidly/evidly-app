-- =====================================================
-- Benchmark Tables for EvidLY Compliance Index
-- =====================================================

-- 1. benchmark_snapshots — aggregated benchmark data by segment
CREATE TABLE IF NOT EXISTS benchmark_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date date NOT NULL,
  vertical text,               -- 'Restaurant', 'Healthcare', etc. NULL = all
  sub_vertical text,           -- 'Fine Dining', 'Fast Casual', etc.
  state text,
  county text,
  location_size_tier text,     -- 'single', '2-10', '11-50', '50+'
  metric_name text NOT NULL,   -- 'overall', 'operational', 'equipment', 'documentation', 'temp_compliance', etc.
  metric_value numeric NOT NULL,
  sample_size integer NOT NULL DEFAULT 0,
  percentile_25 numeric,
  percentile_50 numeric,
  percentile_75 numeric,
  percentile_90 numeric,
  percentile_95 numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bench_snap_date ON benchmark_snapshots(snapshot_date);
CREATE INDEX idx_bench_snap_vertical ON benchmark_snapshots(vertical, snapshot_date);
CREATE INDEX idx_bench_snap_metric ON benchmark_snapshots(metric_name, snapshot_date);

-- 2. location_benchmark_ranks — individual location rankings
CREATE TABLE IF NOT EXISTS location_benchmark_ranks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid NOT NULL,
  snapshot_date date NOT NULL,
  vertical text,
  overall_score numeric,
  overall_percentile integer,
  operational_percentile integer,
  equipment_percentile integer,
  documentation_percentile integer,
  peer_group_size integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bench_rank_loc ON location_benchmark_ranks(location_id, snapshot_date);
CREATE INDEX idx_bench_rank_date ON location_benchmark_ranks(snapshot_date);

-- 3. benchmark_badges — earned compliance badges
CREATE TABLE IF NOT EXISTS benchmark_badges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid NOT NULL,
  badge_tier text NOT NULL CHECK (badge_tier IN ('verified', 'excellence', 'elite', 'platinum')),
  qualifying_period_start date NOT NULL,
  qualifying_period_end date NOT NULL,
  badge_image_url text,
  verification_code text UNIQUE NOT NULL,
  public_page_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bench_badge_loc ON benchmark_badges(location_id);
CREATE INDEX idx_bench_badge_code ON benchmark_badges(verification_code);
CREATE INDEX idx_bench_badge_status ON benchmark_badges(status);

-- 4. benchmark_index_reports — quarterly public index reports
CREATE TABLE IF NOT EXISTS benchmark_index_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quarter integer NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  year integer NOT NULL,
  report_data jsonb NOT NULL DEFAULT '{}',
  pdf_url text,
  published_at timestamptz,
  total_locations_sampled integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (quarter, year)
);

CREATE INDEX idx_bench_report_qy ON benchmark_index_reports(year, quarter);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE benchmark_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_benchmark_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_index_reports ENABLE ROW LEVEL SECURITY;

-- benchmark_snapshots: readable by all authenticated (aggregated, anonymous data)
CREATE POLICY "Authenticated users can read benchmark snapshots"
  ON benchmark_snapshots FOR SELECT
  TO authenticated
  USING (true);

-- location_benchmark_ranks: users can read ranks for their org's locations
CREATE POLICY "Users can read own location ranks"
  ON location_benchmark_ranks FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN user_profiles up ON up.organization_id = l.organization_id
      WHERE up.id = auth.uid()
    )
  );

-- benchmark_badges: users can read their org's badges + public verification
CREATE POLICY "Users can read own location badges"
  ON benchmark_badges FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN user_profiles up ON up.organization_id = l.organization_id
      WHERE up.id = auth.uid()
    )
  );

-- Public read for badge verification by code (anon)
CREATE POLICY "Anyone can verify badges by code"
  ON benchmark_badges FOR SELECT
  TO anon
  USING (status = 'active');

-- benchmark_index_reports: readable by all (public reports)
CREATE POLICY "Anyone can read published index reports"
  ON benchmark_index_reports FOR SELECT
  TO authenticated
  USING (published_at IS NOT NULL);

CREATE POLICY "Anon can read published index reports"
  ON benchmark_index_reports FOR SELECT
  TO anon
  USING (published_at IS NOT NULL);
