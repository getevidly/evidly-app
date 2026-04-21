-- AUDIT-FIX-08 / A-3: Intelligence classification cost tracking
-- Logs every Claude API call with token usage and cost.
-- Separate from rfp_classifications — different purpose, different query patterns.

CREATE TABLE IF NOT EXISTS intelligence_classification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was classified
  signal_id uuid REFERENCES intelligence_signals(id) ON DELETE SET NULL,
  signal_title text,
  signal_type text,

  -- API call details
  model text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,

  -- Cost calculation
  input_cost_usd numeric(10,6),
  output_cost_usd numeric(10,6),
  total_cost_usd numeric(10,6),

  -- Context
  classified_by uuid REFERENCES auth.users(id),
  classification_result jsonb,
  success boolean DEFAULT true,
  error_message text,

  -- When
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classif_log_created ON intelligence_classification_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_classif_log_signal ON intelligence_classification_log(signal_id);
CREATE INDEX IF NOT EXISTS idx_classif_log_model ON intelligence_classification_log(model, created_at DESC);

ALTER TABLE intelligence_classification_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_classif_log" ON intelligence_classification_log;
CREATE POLICY "admin_read_classif_log" ON intelligence_classification_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- Budget alerts config table
CREATE TABLE IF NOT EXISTS ai_budget_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_budget_usd numeric(10,2) DEFAULT 10.00,
  monthly_budget_usd numeric(10,2) DEFAULT 100.00,
  alert_threshold_pct integer DEFAULT 80,
  alert_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO ai_budget_config (daily_budget_usd, monthly_budget_usd, alert_threshold_pct)
VALUES (10.00, 100.00, 80)
ON CONFLICT DO NOTHING;

ALTER TABLE ai_budget_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_budget" ON ai_budget_config;
CREATE POLICY "admin_manage_budget" ON ai_budget_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );
