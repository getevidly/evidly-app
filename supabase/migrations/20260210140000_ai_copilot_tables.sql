-- AI Compliance Copilot tables
-- Stores proactive alerts, corrective action drafts, weekly digests, and interaction logs

-- ═══════════════════════════════════════════════════════════════
-- Table 1: ai_insights
-- Proactive AI-generated insights: patterns, predictions, auto-drafts, seasonal, digests
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  insight_type varchar(30) NOT NULL CHECK (insight_type IN ('pattern', 'prediction', 'auto_draft', 'seasonal', 'digest')),
  severity varchar(20) NOT NULL CHECK (severity IN ('urgent', 'advisory', 'info')),
  title text NOT NULL,
  body text NOT NULL,
  data_references jsonb NOT NULL DEFAULT '[]',
  suggested_actions jsonb NOT NULL DEFAULT '[]',
  status varchar(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'actioned', 'dismissed', 'snoozed')),
  snoozed_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX idx_ai_insights_org ON ai_insights(organization_id);
CREATE INDEX idx_ai_insights_location ON ai_insights(location_id);
CREATE INDEX idx_ai_insights_status ON ai_insights(status);
CREATE INDEX idx_ai_insights_severity ON ai_insights(severity);
CREATE INDEX idx_ai_insights_created ON ai_insights(created_at DESC);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read insights for their organization"
  ON ai_insights FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update insight status for their organization"
  ON ai_insights FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT up.organization_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all insights"
  ON ai_insights FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- Table 2: ai_corrective_actions
-- AI-drafted corrective actions linked to violations/insights
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE ai_corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  violation_id uuid,
  insight_id uuid REFERENCES ai_insights(id) ON DELETE SET NULL,
  draft_content jsonb NOT NULL DEFAULT '{}',
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'completed')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_corrective_location ON ai_corrective_actions(location_id);
CREATE INDEX idx_ai_corrective_status ON ai_corrective_actions(status);
CREATE INDEX idx_ai_corrective_created ON ai_corrective_actions(created_at DESC);

ALTER TABLE ai_corrective_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read corrective actions for their org locations"
  ON ai_corrective_actions FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN user_profiles up ON up.organization_id = l.organization_id
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update corrective actions for their org locations"
  ON ai_corrective_actions FOR UPDATE
  TO authenticated
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN user_profiles up ON up.organization_id = l.organization_id
      WHERE up.id = auth.uid()
    )
  )
  WITH CHECK (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN user_profiles up ON up.organization_id = l.organization_id
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all corrective actions"
  ON ai_corrective_actions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- Table 3: ai_weekly_digests
-- Personalized AI-generated weekly summaries per user per location
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE ai_weekly_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role varchar(30),
  digest_content jsonb NOT NULL DEFAULT '{}',
  period_start date NOT NULL,
  period_end date NOT NULL,
  delivered_via varchar(20) NOT NULL DEFAULT 'in_app' CHECK (delivered_via IN ('in_app', 'email', 'sms')),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_digests_org ON ai_weekly_digests(organization_id);
CREATE INDEX idx_ai_digests_user ON ai_weekly_digests(user_id);
CREATE INDEX idx_ai_digests_period ON ai_weekly_digests(period_start, period_end);

ALTER TABLE ai_weekly_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own digests"
  ON ai_weekly_digests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all digests"
  ON ai_weekly_digests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- Table 4: ai_interaction_logs
-- Flywheel data: every AI interaction for improvement and analytics
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE ai_interaction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  interaction_type varchar(30) NOT NULL CHECK (interaction_type IN ('chat', 'inspection_prep', 'document_analysis', 'corrective_draft', 'pattern_alert', 'digest')),
  query text,
  response text,
  feedback varchar(20) CHECK (feedback IN ('helpful', 'not_helpful', 'neutral', NULL)),
  tokens_used integer DEFAULT 0,
  model_used varchar(60),
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_logs_user ON ai_interaction_logs(user_id);
CREATE INDEX idx_ai_logs_type ON ai_interaction_logs(interaction_type);
CREATE INDEX idx_ai_logs_created ON ai_interaction_logs(created_at DESC);

ALTER TABLE ai_interaction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own interaction logs"
  ON ai_interaction_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own interaction logs"
  ON ai_interaction_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update feedback on their own logs"
  ON ai_interaction_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage all interaction logs"
  ON ai_interaction_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
