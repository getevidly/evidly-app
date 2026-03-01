-- ================================================================
-- Frequency Change Audit Log
-- Tracks when users reduce service frequency for compliance categories.
-- Captures risk acknowledgment, reason, and jurisdiction context.
-- ================================================================

CREATE TABLE IF NOT EXISTS frequency_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  previous_frequency TEXT NOT NULL,
  new_frequency TEXT NOT NULL,
  percentage_reduction NUMERIC(5,2),
  jurisdiction_minimum TEXT,
  below_jurisdiction_minimum BOOLEAN DEFAULT false,
  risk_acknowledged BOOLEAN DEFAULT false,
  reduction_reason TEXT NOT NULL,
  reduction_details TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  owner_notified BOOLEAN DEFAULT false,
  compliance_notified BOOLEAN DEFAULT false
);

CREATE INDEX idx_fcl_org ON frequency_change_log(organization_id, changed_at DESC);
CREATE INDEX idx_fcl_category ON frequency_change_log(category);

ALTER TABLE frequency_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org frequency changes"
  ON frequency_change_log FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org frequency changes"
  ON frequency_change_log FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access frequency change log"
  ON frequency_change_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);
