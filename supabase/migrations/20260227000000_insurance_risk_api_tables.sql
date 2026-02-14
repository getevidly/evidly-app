-- ============================================================
-- Insurance Risk Score API — Task #51 (Roadmap #11)
-- ============================================================
-- API partner registry, customer-initiated score shares,
-- cached risk scores, and API access audit log.
-- ============================================================

-- ── API Partner Registry ────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('insurance', 'broker', 'auditor')),
  api_key TEXT NOT NULL UNIQUE,
  access_level TEXT NOT NULL DEFAULT 'token_only' CHECK (access_level IN ('token_only', 'direct')),
  contact_email TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_partners_key ON api_partners(api_key) WHERE active = true;

-- ── Customer-Initiated Score Shares ──────────────────────────

CREATE TABLE IF NOT EXISTS risk_score_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  shared_by UUID NOT NULL,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  recipient_name TEXT,
  recipient_email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  scope JSONB NOT NULL DEFAULT '["overall","factors","trend","percentile"]',
  accessed_count INTEGER NOT NULL DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rss_token ON risk_score_shares(share_token) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_rss_org ON risk_score_shares(organization_id);

-- ── API Access Audit Log ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES api_partners(id),
  location_id UUID,
  endpoint TEXT NOT NULL,
  response_score REAL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aal_partner ON api_access_log(partner_id, created_at DESC);

-- ── Cached Insurance Risk Scores ─────────────────────────────

CREATE TABLE IF NOT EXISTS insurance_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  overall_score REAL NOT NULL,
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('excellent', 'good', 'moderate', 'elevated', 'high')),
  factor_scores JSONB NOT NULL DEFAULT '{}',
  score_history JSONB DEFAULT '[]',
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
  industry_percentile REAL,
  data_points INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  UNIQUE(location_id)
);

CREATE INDEX IF NOT EXISTS idx_irs_org ON insurance_risk_scores(organization_id);

-- ── RLS Policies ─────────────────────────────────────────────

ALTER TABLE api_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_score_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_risk_scores ENABLE ROW LEVEL SECURITY;

-- API partners: service role only
CREATE POLICY "ap_service_access" ON api_partners
  FOR ALL TO service_role
  USING (true);

-- Risk score shares: users manage their org's shares
CREATE POLICY "rss_org_access" ON risk_score_shares
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Service role can read shares (for public insurer view endpoint)
CREATE POLICY "rss_service_read" ON risk_score_shares
  FOR SELECT TO service_role
  USING (true);

-- API access log: service role writes, org users read their data
CREATE POLICY "aal_service_write" ON api_access_log
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "aal_org_read" ON api_access_log
  FOR SELECT TO authenticated
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN user_profiles up ON up.organization_id = l.organization_id
      WHERE up.id = auth.uid()
    )
  );

-- Cached risk scores: org users read, service role writes
CREATE POLICY "irs_org_read" ON insurance_risk_scores
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "irs_service_write" ON insurance_risk_scores
  FOR ALL TO service_role
  USING (true);
