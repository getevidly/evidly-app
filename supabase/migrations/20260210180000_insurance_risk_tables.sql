-- =====================================================
-- Insurance Risk Score Tables
-- =====================================================
-- Stores insurance risk score snapshots, carrier API keys,
-- and API request logs for rate limiting.
-- =====================================================

-- 1. insurance_risk_scores — per-location score snapshots
CREATE TABLE IF NOT EXISTS insurance_risk_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  location_id uuid NOT NULL,
  overall_score numeric NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  tier text NOT NULL CHECK (tier IN ('Preferred Risk', 'Standard Risk', 'Elevated Risk', 'High Risk')),
  fire_risk_score numeric NOT NULL CHECK (fire_risk_score >= 0 AND fire_risk_score <= 100),
  food_safety_score numeric NOT NULL CHECK (food_safety_score >= 0 AND food_safety_score <= 100),
  documentation_score numeric NOT NULL CHECK (documentation_score >= 0 AND documentation_score <= 100),
  operational_score numeric NOT NULL CHECK (operational_score >= 0 AND operational_score <= 100),
  category_breakdown jsonb NOT NULL DEFAULT '{}',
  factors_count integer NOT NULL DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ins_risk_org ON insurance_risk_scores(organization_id);
CREATE INDEX idx_ins_risk_loc ON insurance_risk_scores(location_id, calculated_at DESC);
CREATE INDEX idx_ins_risk_date ON insurance_risk_scores(calculated_at DESC);

-- 2. insurance_api_keys — carrier API access credentials
CREATE TABLE IF NOT EXISTS insurance_api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  carrier_name text NOT NULL,
  api_key text UNIQUE NOT NULL,
  active boolean NOT NULL DEFAULT true,
  rate_limit_per_minute integer NOT NULL DEFAULT 60,
  rate_limit_per_day integer NOT NULL DEFAULT 1000,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ins_api_key ON insurance_api_keys(api_key) WHERE active = true;
CREATE INDEX idx_ins_api_org ON insurance_api_keys(organization_id);

-- 3. insurance_api_requests — request log for rate limiting and analytics
CREATE TABLE IF NOT EXISTS insurance_api_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid NOT NULL REFERENCES insurance_api_keys(id),
  organization_id uuid NOT NULL,
  endpoint text NOT NULL DEFAULT '/risk-score',
  response_status integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ins_api_req_key ON insurance_api_requests(api_key_id, created_at DESC);
CREATE INDEX idx_ins_api_req_org ON insurance_api_requests(organization_id, created_at DESC);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE insurance_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_api_requests ENABLE ROW LEVEL SECURITY;

-- insurance_risk_scores: users can read their org's scores
CREATE POLICY "Users can read own org risk scores"
  ON insurance_risk_scores FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

-- insurance_api_keys: org admins can read/manage their keys
CREATE POLICY "Users can read own org API keys"
  ON insurance_api_keys FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org API keys"
  ON insurance_api_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

-- insurance_api_requests: readable by org members for usage analytics
CREATE POLICY "Users can read own org API requests"
  ON insurance_api_requests FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );
