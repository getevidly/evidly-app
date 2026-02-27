-- COMMAND-CENTER-1: Intelligence Command Center tables
-- 6 new tables for signal triage, game plans, platform updates,
-- client notifications, and crawl health monitoring.

-- ── 1. intelligence_signals ──────────────────────────────────
CREATE TABLE IF NOT EXISTS intelligence_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  jurisdiction TEXT,
  state_code TEXT,
  affected_pillars TEXT[] DEFAULT '{}',
  raw_data JSONB DEFAULT '{}',
  source_url TEXT,
  confidence_score NUMERIC(3,2) DEFAULT 0.50,
  status TEXT NOT NULL DEFAULT 'new',
  deferred_until TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signals_status_created
  ON intelligence_signals (status, created_at DESC);

-- ── 2. intelligence_game_plans ───────────────────────────────
CREATE TABLE IF NOT EXISTS intelligence_game_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES intelligence_signals(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'draft',
  tasks JSONB DEFAULT '[]',
  task_status JSONB DEFAULT '{}',
  completion_notes TEXT,
  platform_update_id UUID,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_plans_status
  ON intelligence_game_plans (status);

-- ── 3. platform_updates ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES intelligence_signals(id),
  title TEXT NOT NULL,
  description TEXT,
  update_type TEXT NOT NULL,
  target_entity TEXT,
  changes_preview JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  applied_by TEXT,
  applied_at TIMESTAMPTZ,
  rolled_back_by TEXT,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_updates_status
  ON platform_updates (status);

-- ── 4. platform_update_log ───────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_update_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_update_id UUID REFERENCES platform_updates(id) NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  snapshot_before JSONB DEFAULT '{}',
  snapshot_after JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 5. client_notifications ──────────────────────────────────
CREATE TABLE IF NOT EXISTS client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES intelligence_signals(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  target_audience TEXT DEFAULT 'all',
  target_filter JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_notifications_status
  ON client_notifications (status, created_at DESC);

-- ── 6. crawl_execution_log ───────────────────────────────────
CREATE TABLE IF NOT EXISTS crawl_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  events_found INT DEFAULT 0,
  events_new INT DEFAULT 0,
  events_duplicate INT DEFAULT 0,
  duration_ms INT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_log_source_started
  ON crawl_execution_log (source_id, started_at DESC);

-- ── updated_at triggers ──────────────────────────────────────

CREATE OR REPLACE FUNCTION update_command_center_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_signals_updated_at
  BEFORE UPDATE ON intelligence_signals
  FOR EACH ROW EXECUTE FUNCTION update_command_center_updated_at();

CREATE TRIGGER trg_game_plans_updated_at
  BEFORE UPDATE ON intelligence_game_plans
  FOR EACH ROW EXECUTE FUNCTION update_command_center_updated_at();

CREATE TRIGGER trg_platform_updates_updated_at
  BEFORE UPDATE ON platform_updates
  FOR EACH ROW EXECUTE FUNCTION update_command_center_updated_at();

CREATE TRIGGER trg_client_notifications_updated_at
  BEFORE UPDATE ON client_notifications
  FOR EACH ROW EXECUTE FUNCTION update_command_center_updated_at();

-- ── RLS policies ─────────────────────────────────────────────

ALTER TABLE intelligence_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_game_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_update_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_execution_log ENABLE ROW LEVEL SECURITY;

-- Admin read/write (email ends with @getevidly.com)
DO $$ BEGIN
  EXECUTE format(
    'CREATE POLICY admin_all ON intelligence_signals FOR ALL USING (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'') WITH CHECK (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'')'
  );
  EXECUTE format(
    'CREATE POLICY admin_all ON intelligence_game_plans FOR ALL USING (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'') WITH CHECK (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'')'
  );
  EXECUTE format(
    'CREATE POLICY admin_all ON platform_updates FOR ALL USING (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'') WITH CHECK (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'')'
  );
  EXECUTE format(
    'CREATE POLICY admin_all ON platform_update_log FOR ALL USING (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'') WITH CHECK (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'')'
  );
  EXECUTE format(
    'CREATE POLICY admin_all ON client_notifications FOR ALL USING (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'') WITH CHECK (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'')'
  );
  EXECUTE format(
    'CREATE POLICY admin_all ON crawl_execution_log FOR ALL USING (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'') WITH CHECK (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'')'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service role bypass (for edge functions)
DO $$ BEGIN
  EXECUTE 'CREATE POLICY service_role_all ON intelligence_signals FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  EXECUTE 'CREATE POLICY service_role_all ON intelligence_game_plans FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  EXECUTE 'CREATE POLICY service_role_all ON platform_updates FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  EXECUTE 'CREATE POLICY service_role_all ON platform_update_log FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  EXECUTE 'CREATE POLICY service_role_all ON client_notifications FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  EXECUTE 'CREATE POLICY service_role_all ON crawl_execution_log FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
