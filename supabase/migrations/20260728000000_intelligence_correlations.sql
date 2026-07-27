-- ============================================================
-- Intelligence Correlations
-- Maps published signals to the organizations they affect.
-- Each row = "signal X is relevant to org Y, because Z."
-- ============================================================

CREATE TABLE IF NOT EXISTS intelligence_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES intelligence_signals(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('national', 'county', 'industry', 'requirement')),
  match_reason TEXT NOT NULL,
  requirement_code TEXT,
  relevance_score NUMERIC(3,2) DEFAULT 0.50,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (signal_id, organization_id, match_type)
);

CREATE INDEX IF NOT EXISTS idx_correlations_signal ON intelligence_correlations (signal_id);
CREATE INDEX IF NOT EXISTS idx_correlations_org ON intelligence_correlations (organization_id);
CREATE INDEX IF NOT EXISTS idx_correlations_match ON intelligence_correlations (match_type);

-- RLS: staff read + service_role write
ALTER TABLE intelligence_correlations ENABLE ROW LEVEL SECURITY;

-- Platform admins (getevidly.com staff) can read all
CREATE POLICY "staff_read_correlations"
  ON intelligence_correlations FOR SELECT
  USING (
    auth.jwt() ->> 'email' LIKE '%@getevidly.com'
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'platform_admin'
    )
  );

-- Org members can read their own correlations
CREATE POLICY "org_members_read_own_correlations"
  ON intelligence_correlations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

-- Service role can insert/update/delete (edge functions)
CREATE POLICY "service_role_manage_correlations"
  ON intelligence_correlations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
