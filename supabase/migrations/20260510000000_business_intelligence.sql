-- ============================================================================
-- BUSINESS-INTELLIGENCE-01: Add BI columns to intelligence_signals + risk_plans
-- ============================================================================

-- 1a. Add missing columns to intelligence_signals
-- Uses individual ALTER TABLE statements with IF NOT EXISTS
-- (some columns may already exist from earlier migrations)

ALTER TABLE intelligence_signals ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE intelligence_signals ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE intelligence_signals ADD COLUMN IF NOT EXISTS county text;
ALTER TABLE intelligence_signals ADD COLUMN IF NOT EXISTS workforce_risk_level text;
ALTER TABLE intelligence_signals ADD COLUMN IF NOT EXISTS recommended_action text;
ALTER TABLE intelligence_signals ADD COLUMN IF NOT EXISTS client_impact_revenue text;
ALTER TABLE intelligence_signals ADD COLUMN IF NOT EXISTS client_impact_liability text;
ALTER TABLE intelligence_signals ADD COLUMN IF NOT EXISTS client_impact_cost text;
ALTER TABLE intelligence_signals ADD COLUMN IF NOT EXISTS client_impact_operational text;
ALTER TABLE intelligence_signals ADD COLUMN IF NOT EXISTS client_impact_workforce text;
ALTER TABLE intelligence_signals ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;
ALTER TABLE intelligence_signals ADD COLUMN IF NOT EXISTS is_sample boolean DEFAULT false;
ALTER TABLE intelligence_signals ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Index for BI queries: published signals per org
CREATE INDEX IF NOT EXISTS idx_signals_org_published
  ON intelligence_signals (org_id, is_published)
  WHERE is_published = true;

-- Index for sample data queries
CREATE INDEX IF NOT EXISTS idx_signals_sample
  ON intelligence_signals (is_sample)
  WHERE is_sample = true;

-- ============================================================================
-- 1b. Create risk_plans table
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  signal_id        uuid NOT NULL REFERENCES intelligence_signals(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'not_started'
                     CHECK (status IN ('not_started', 'in_progress', 'completed', 'accepted')),
  owner_name       text,
  due_date         date,
  mitigation_steps text,
  accepted_reason  text,
  notes            text,
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (org_id, signal_id)
);

ALTER TABLE risk_plans ENABLE ROW LEVEL SECURITY;

-- RLS: Org members can manage their own risk plans
DROP POLICY IF EXISTS "Org members can manage risk plans" ON risk_plans;
CREATE POLICY "Org members can manage risk plans"
  ON risk_plans FOR ALL
  USING (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- RLS: Service role full access
DROP POLICY IF EXISTS "Service role full access to risk plans" ON risk_plans;
CREATE POLICY "Service role full access to risk plans"
  ON risk_plans FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rp_org ON risk_plans (org_id);
CREATE INDEX IF NOT EXISTS idx_rp_signal ON risk_plans (signal_id);
CREATE INDEX IF NOT EXISTS idx_rp_org_status ON risk_plans (org_id, status);

-- Auto-update updated_at on every save
CREATE OR REPLACE FUNCTION update_risk_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS risk_plans_updated_at ON risk_plans;
CREATE TRIGGER risk_plans_updated_at
  BEFORE UPDATE ON risk_plans
  FOR EACH ROW EXECUTE FUNCTION update_risk_plans_updated_at();
