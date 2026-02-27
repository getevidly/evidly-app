-- ============================================================================
-- ASSESS-TOOL-1: Compliance Assessment Tool — 3 tables + RLS + indexes
-- ============================================================================

-- ── Assessment Leads ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assessment_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  zip_code TEXT NOT NULL,
  city TEXT,
  state TEXT,
  county TEXT,
  referral_source TEXT,
  utm_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE assessment_leads ENABLE ROW LEVEL SECURITY;

-- Anon can insert (lead capture form is public)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_leads' AND policyname = 'assessment_leads_anon_insert') THEN
    CREATE POLICY assessment_leads_anon_insert ON assessment_leads FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- Authenticated users can read (admin dashboard)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_leads' AND policyname = 'assessment_leads_auth_read') THEN
    CREATE POLICY assessment_leads_auth_read ON assessment_leads FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Service role has full access (edge functions)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_leads' AND policyname = 'assessment_leads_service_all') THEN
    CREATE POLICY assessment_leads_service_all ON assessment_leads FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assessment_leads_created_at ON assessment_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_leads_email ON assessment_leads (email);

-- ── Assessment Responses ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES assessment_leads(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer_value TEXT NOT NULL,
  answer_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_responses' AND policyname = 'assessment_responses_anon_insert') THEN
    CREATE POLICY assessment_responses_anon_insert ON assessment_responses FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_responses' AND policyname = 'assessment_responses_auth_read') THEN
    CREATE POLICY assessment_responses_auth_read ON assessment_responses FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_responses' AND policyname = 'assessment_responses_service_all') THEN
    CREATE POLICY assessment_responses_service_all ON assessment_responses FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assessment_responses_lead_id ON assessment_responses (lead_id);

-- ── Assessment Results ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES assessment_leads(id) ON DELETE CASCADE,
  overall_grade TEXT NOT NULL CHECK (overall_grade IN ('A','B','C','D','F')),
  facility_safety_score INT DEFAULT 0,
  food_safety_score INT DEFAULT 0,
  documentation_score INT DEFAULT 0,
  revenue_risk INT DEFAULT 0,
  liability_risk INT DEFAULT 0,
  cost_risk INT DEFAULT 0,
  operational_risk INT DEFAULT 0,
  findings_json JSONB DEFAULT '[]',
  risk_drivers_json JSONB DEFAULT '{}',
  estimated_revenue_risk_dollars REAL DEFAULT 0,
  estimated_liability_risk_dollars REAL DEFAULT 0,
  estimated_cost_risk_dollars REAL DEFAULT 0,
  estimated_operational_risk_days REAL DEFAULT 0,
  total_estimated_exposure_low REAL DEFAULT 0,
  total_estimated_exposure_high REAL DEFAULT 0,
  recommendations_json JSONB DEFAULT '[]',
  jurisdiction_detected TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_results' AND policyname = 'assessment_results_anon_insert') THEN
    CREATE POLICY assessment_results_anon_insert ON assessment_results FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_results' AND policyname = 'assessment_results_auth_read') THEN
    CREATE POLICY assessment_results_auth_read ON assessment_results FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assessment_results' AND policyname = 'assessment_results_service_all') THEN
    CREATE POLICY assessment_results_service_all ON assessment_results FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assessment_results_lead_id ON assessment_results (lead_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_grade ON assessment_results (overall_grade);
CREATE INDEX IF NOT EXISTS idx_assessment_results_created_at ON assessment_results (created_at DESC);
