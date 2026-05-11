-- M10: share_recommendation_rules — drives "recommended documents" in Send wizard

BEGIN;

CREATE TABLE IF NOT EXISTS share_recommendation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type text NOT NULL
    CHECK (recipient_type IN (
      'ehd', 'ahj', 'insurance_broker', 'insurance_carrier', 'auditor', 'client_legal'
    )),
  purpose text NOT NULL,
  required_doc_types text[] NOT NULL DEFAULT '{}',
  recommended_doc_types text[] NOT NULL DEFAULT '{}',
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipient_type, purpose)
);

-- Enable RLS
ALTER TABLE share_recommendation_rules ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users (rules are global, not org-scoped)
CREATE POLICY share_recommendation_rules_select
  ON share_recommendation_rules FOR SELECT
  TO authenticated
  USING (true);

-- Service role manages
CREATE POLICY share_recommendation_rules_manage
  ON share_recommendation_rules FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_share_recommendation_rules_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_share_recommendation_rules_updated_at
  BEFORE UPDATE ON share_recommendation_rules
  FOR EACH ROW EXECUTE FUNCTION update_share_recommendation_rules_updated_at();

-- Seed from UI Contract Manifest Table 2 purpose mappings
INSERT INTO share_recommendation_rules (recipient_type, purpose, required_doc_types, recommended_doc_types, rationale)
VALUES
  -- EHD (Environmental Health Dept)
  ('ehd', 'Annual renewal', '{"health_permit","food_handler_cards"}', '{"haccp_plan","mock_inspection_report"}', 'Annual EHD renewal requires current health permit + staff certs'),
  ('ehd', 'Inspection follow-up', '{"mock_inspection_report"}', '{"corrective_action_report","haccp_plan"}', 'Post-inspection follow-up with corrective evidence'),
  ('ehd', 'Variance request', '{"haccp_plan"}', '{"health_permit"}', 'Variance requests require documented HACCP plan'),

  -- AHJ (Authority Having Jurisdiction — Fire)
  ('ahj', 'Annual fire inspection', '{"hood_cleaning_report","fire_suppression_test"}', '{"fire_alarm_inspection"}', 'Annual fire inspection evidence package'),
  ('ahj', 'Plan check', '{"fire_suppression_test"}', '{"hood_cleaning_report"}', 'Plan check requires suppression system documentation'),
  ('ahj', 'Permit renewal', '{"fire_suppression_test","hood_cleaning_report"}', '{}', 'Fire permit renewal requires current service records'),

  -- Insurance Broker
  ('insurance_broker', 'Annual renewal', '{"coi","hood_cleaning_report","fire_suppression_test"}', '{"health_permit","business_license"}', 'Insurance renewal: compliance evidence reduces premiums'),
  ('insurance_broker', 'Claim documentation', '{"coi"}', '{"mock_inspection_report","hood_cleaning_report"}', 'Claim support documentation'),
  ('insurance_broker', 'Underwriting review', '{"coi","hood_cleaning_report","fire_suppression_test","health_permit"}', '{"haccp_plan"}', 'Full underwriting evidence package'),

  -- Insurance Carrier
  ('insurance_carrier', 'Claim submission', '{"coi"}', '{"mock_inspection_report","hood_cleaning_report","fire_suppression_test"}', 'Direct carrier claim submission'),
  ('insurance_carrier', 'Coverage verification', '{"coi"}', '{"business_license"}', 'Coverage verification request'),

  -- Auditor
  ('auditor', 'Compliance audit', '{"health_permit","food_handler_cards","hood_cleaning_report","fire_suppression_test","coi"}', '{"haccp_plan","mock_inspection_report"}', 'Full compliance audit evidence package'),
  ('auditor', 'Investigation', '{"mock_inspection_report"}', '{"corrective_action_report","hood_cleaning_report"}', 'Investigation-specific evidence'),

  -- Client / Legal
  ('client_legal', 'Discovery', '{"coi","business_license"}', '{"health_permit","hood_cleaning_report"}', 'Legal discovery response'),
  ('client_legal', 'Contract compliance', '{"coi","health_permit","hood_cleaning_report"}', '{"fire_suppression_test"}', 'Contractual compliance evidence')
ON CONFLICT (recipient_type, purpose) DO NOTHING;

COMMIT;
