-- HACCP Management Tables
-- Stores HACCP plans, critical control points, monitoring logs, and corrective actions

-- ── haccp_plans ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haccp_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'needs_review', 'archived')),
  last_reviewed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_haccp_plans_org ON haccp_plans(organization_id);
ALTER TABLE haccp_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own org haccp plans"
    ON haccp_plans FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own org haccp plans"
    ON haccp_plans FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own org haccp plans"
    ON haccp_plans FOR UPDATE TO authenticated
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access haccp plans"
    ON haccp_plans FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── haccp_critical_control_points ──────────────────────────────────
CREATE TABLE IF NOT EXISTS haccp_critical_control_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES haccp_plans(id) ON DELETE CASCADE,
  ccp_number VARCHAR(20) NOT NULL,
  hazard TEXT NOT NULL,
  critical_limit TEXT NOT NULL,
  monitoring_procedure TEXT NOT NULL,
  corrective_action TEXT NOT NULL,
  verification TEXT NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'checklist' CHECK (source IN ('temp_log', 'checklist')),
  equipment_name TEXT,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_haccp_ccps_plan ON haccp_critical_control_points(plan_id);
CREATE INDEX IF NOT EXISTS idx_haccp_ccps_location ON haccp_critical_control_points(location_id);
ALTER TABLE haccp_critical_control_points ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view ccps via plan org"
    ON haccp_critical_control_points FOR SELECT TO authenticated
    USING (plan_id IN (
      SELECT id FROM haccp_plans WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert ccps via plan org"
    ON haccp_critical_control_points FOR INSERT TO authenticated
    WITH CHECK (plan_id IN (
      SELECT id FROM haccp_plans WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update ccps via plan org"
    ON haccp_critical_control_points FOR UPDATE TO authenticated
    USING (plan_id IN (
      SELECT id FROM haccp_plans WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access ccps"
    ON haccp_critical_control_points FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── haccp_monitoring_logs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haccp_monitoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ccp_id UUID NOT NULL REFERENCES haccp_critical_control_points(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reading_value NUMERIC,
  reading_unit VARCHAR(10),
  reading_text TEXT,
  is_within_limit BOOLEAN NOT NULL,
  monitored_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  monitored_by_name TEXT,
  monitored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_haccp_monitoring_ccp ON haccp_monitoring_logs(ccp_id, monitored_at DESC);
CREATE INDEX IF NOT EXISTS idx_haccp_monitoring_org ON haccp_monitoring_logs(organization_id);
ALTER TABLE haccp_monitoring_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own org monitoring logs"
    ON haccp_monitoring_logs FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own org monitoring logs"
    ON haccp_monitoring_logs FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access monitoring logs"
    ON haccp_monitoring_logs FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── haccp_corrective_actions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS haccp_corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES haccp_plans(id) ON DELETE SET NULL,
  ccp_id UUID REFERENCES haccp_critical_control_points(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  ccp_number VARCHAR(20) NOT NULL,
  ccp_hazard TEXT NOT NULL,
  deviation TEXT NOT NULL,
  critical_limit TEXT NOT NULL,
  recorded_value TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  action_by TEXT NOT NULL,
  verified_by TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  source TEXT,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_haccp_ca_org ON haccp_corrective_actions(organization_id);
CREATE INDEX IF NOT EXISTS idx_haccp_ca_status ON haccp_corrective_actions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_haccp_ca_location ON haccp_corrective_actions(location_id);
ALTER TABLE haccp_corrective_actions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own org corrective actions"
    ON haccp_corrective_actions FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own org corrective actions"
    ON haccp_corrective_actions FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own org corrective actions"
    ON haccp_corrective_actions FOR UPDATE TO authenticated
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access corrective actions"
    ON haccp_corrective_actions FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Updated at triggers ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_haccp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER haccp_plans_updated_at
    BEFORE UPDATE ON haccp_plans
    FOR EACH ROW EXECUTE FUNCTION update_haccp_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER haccp_ccps_updated_at
    BEFORE UPDATE ON haccp_critical_control_points
    FOR EACH ROW EXECUTE FUNCTION update_haccp_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER haccp_ca_updated_at
    BEFORE UPDATE ON haccp_corrective_actions
    FOR EACH ROW EXECUTE FUNCTION update_haccp_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
