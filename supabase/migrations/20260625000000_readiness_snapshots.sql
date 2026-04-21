-- ============================================================
-- SUPERPOWERS-APP-01: Readiness Snapshots for Compliance Trajectory (SP3)
-- Daily snapshots of per-location readiness scores
-- Scheduled via pg_cron: SELECT cron.schedule('daily-readiness-snapshot', '0 6 * * *', $$SELECT net.http_post(...)$$);
-- ============================================================

CREATE TABLE IF NOT EXISTS readiness_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  food_safety_score NUMERIC(5,2),
  facility_safety_score NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  open_violations INT DEFAULT 0,
  pending_corrective_actions INT DEFAULT 0,
  overdue_temp_checks INT DEFAULT 0,
  expired_documents INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, location_id, snapshot_date)
);

-- Index for efficient time-series queries
CREATE INDEX IF NOT EXISTS idx_readiness_snapshots_org_date
  ON readiness_snapshots(org_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_readiness_snapshots_location_date
  ON readiness_snapshots(location_id, snapshot_date DESC);

-- RLS
ALTER TABLE readiness_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org snapshots" ON readiness_snapshots;
CREATE POLICY "Users can view own org snapshots"
  ON readiness_snapshots FOR SELECT
  USING (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service role full access on readiness_snapshots" ON readiness_snapshots;
CREATE POLICY "Service role full access on readiness_snapshots"
  ON readiness_snapshots FOR ALL
  USING (auth.role() = 'service_role');
