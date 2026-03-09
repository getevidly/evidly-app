-- ============================================================
-- Workforce Risk Signals (CIC Pillar 5)
-- ============================================================
-- Tracks employee certification gaps, training deficiencies,
-- and staffing-related compliance signals.
-- employee_certifications table already exists (20260205215132).
-- ============================================================

CREATE TABLE IF NOT EXISTS workforce_risk_signals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     UUID REFERENCES locations(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  signal_type     VARCHAR(50) NOT NULL CHECK (signal_type IN (
    'food_handler_cert_expired',
    'food_handler_cert_expiring_soon',
    'cfpm_cert_expired',
    'cfpm_cert_expiring_soon',
    'training_incomplete',
    'role_cert_gap',
    'fire_safety_training_missing',
    'fire_extinguisher_training_missing',
    'high_turnover_flag'
  )),
  affected_count  INTEGER DEFAULT 1,
  details         JSONB DEFAULT '{}',
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workforce_risk_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view workforce signals"
ON workforce_risk_signals FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM user_profiles WHERE id = auth.uid()
));

CREATE INDEX idx_workforce_signals_org
ON workforce_risk_signals (organization_id, created_at DESC);

CREATE INDEX idx_workforce_signals_unresolved
ON workforce_risk_signals (organization_id)
WHERE resolved_at IS NULL;
