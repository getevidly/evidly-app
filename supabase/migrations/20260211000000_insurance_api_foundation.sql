-- =====================================================
-- Insurance API Foundation Tables
-- =====================================================
-- Expands the insurance risk system with factor-level
-- detail, score history for trends, operator consent
-- management, detailed API audit logs, and report tracking.
-- =====================================================

-- 1. insurance_risk_factors — per-factor detail rows
CREATE TABLE IF NOT EXISTS insurance_risk_factors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid NOT NULL,
  risk_score_id uuid NOT NULL REFERENCES insurance_risk_scores(id) ON DELETE CASCADE,
  factor_name text NOT NULL,
  factor_category text NOT NULL CHECK (factor_category IN ('fire', 'food_safety', 'documentation', 'operations')),
  current_value numeric NOT NULL DEFAULT 0 CHECK (current_value >= 0 AND current_value <= 100),
  max_value numeric NOT NULL DEFAULT 100,
  weight numeric NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 1),
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('pass', 'warning', 'fail', 'unknown')),
  impact_description text,
  improvement_action text,
  reference_standard text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ins_factors_loc ON insurance_risk_factors(location_id, factor_category);
CREATE INDEX idx_ins_factors_score ON insurance_risk_factors(risk_score_id);

-- 2. insurance_score_history — monthly score snapshots for trend API
CREATE TABLE IF NOT EXISTS insurance_score_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  location_id uuid NOT NULL,
  score_date date NOT NULL,
  overall_score numeric NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  fire_score numeric NOT NULL CHECK (fire_score >= 0 AND fire_score <= 100),
  food_safety_score numeric NOT NULL CHECK (food_safety_score >= 0 AND food_safety_score <= 100),
  documentation_score numeric NOT NULL CHECK (documentation_score >= 0 AND documentation_score <= 100),
  operations_score numeric NOT NULL CHECK (operations_score >= 0 AND operations_score <= 100),
  tier text NOT NULL CHECK (tier IN ('Preferred Risk', 'Standard Risk', 'Elevated Risk', 'High Risk')),
  factors_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ins_history_loc ON insurance_score_history(location_id, score_date DESC);
CREATE INDEX idx_ins_history_org ON insurance_score_history(organization_id);
CREATE UNIQUE INDEX idx_ins_history_unique ON insurance_score_history(location_id, score_date);

-- 3. insurance_consent — operator consent per carrier partner
CREATE TABLE IF NOT EXISTS insurance_consent (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  location_id uuid NOT NULL,
  partner_name text NOT NULL,
  consent_granted boolean NOT NULL DEFAULT false,
  consent_type text NOT NULL DEFAULT 'api_access' CHECK (consent_type IN ('api_access', 'report_sharing', 'full_access')),
  granted_by uuid,
  granted_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ins_consent_org ON insurance_consent(organization_id);
CREATE UNIQUE INDEX idx_ins_consent_unique ON insurance_consent(location_id, partner_name);
CREATE INDEX idx_ins_consent_active ON insurance_consent(consent_granted) WHERE revoked_at IS NULL;

-- 4. insurance_api_logs — detailed API audit trail
CREATE TABLE IF NOT EXISTS insurance_api_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid NOT NULL REFERENCES insurance_api_keys(id),
  endpoint text NOT NULL,
  request_method text NOT NULL DEFAULT 'GET',
  location_id text,
  response_code integer,
  ip_address text,
  user_agent text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ins_api_logs_key ON insurance_api_logs(api_key_id, created_at DESC);
CREATE INDEX idx_ins_api_logs_endpoint ON insurance_api_logs(endpoint, created_at DESC);

-- 5. insurance_reports — tracks generated PDF reports
CREATE TABLE IF NOT EXISTS insurance_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  location_id uuid NOT NULL,
  report_type text NOT NULL DEFAULT 'risk_profile' CHECK (report_type IN ('risk_profile', 'factor_breakdown', 'incident_summary', 'fire_safety')),
  generated_by uuid,
  generated_at timestamptz DEFAULT now(),
  file_url text,
  shared_with text[] DEFAULT '{}',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ins_reports_org ON insurance_reports(organization_id, generated_at DESC);
CREATE INDEX idx_ins_reports_loc ON insurance_reports(location_id);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE insurance_risk_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_reports ENABLE ROW LEVEL SECURITY;

-- insurance_risk_factors: read via org membership (join through risk_score_id → insurance_risk_scores → organization_id)
CREATE POLICY "Users can read own org risk factors"
  ON insurance_risk_factors FOR SELECT
  TO authenticated
  USING (
    risk_score_id IN (
      SELECT irs.id FROM insurance_risk_scores irs
      WHERE irs.organization_id IN (
        SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
      )
    )
  );

-- insurance_score_history: read via org membership
CREATE POLICY "Users can read own org score history"
  ON insurance_score_history FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

-- insurance_consent: read/manage via org membership
CREATE POLICY "Users can read own org consent records"
  ON insurance_consent FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own org consent"
  ON insurance_consent FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org consent"
  ON insurance_consent FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

-- insurance_api_logs: read via org's API keys
CREATE POLICY "Users can read own org API logs"
  ON insurance_api_logs FOR SELECT
  TO authenticated
  USING (
    api_key_id IN (
      SELECT iak.id FROM insurance_api_keys iak
      WHERE iak.organization_id IN (
        SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
      )
    )
  );

-- insurance_reports: read/create via org membership
CREATE POLICY "Users can read own org reports"
  ON insurance_reports FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can create own org reports"
  ON insurance_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );
