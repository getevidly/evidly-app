-- EDGE-FN-MONITOR-1: Edge Function Health Monitor tables
-- 2 new tables: edge_function_registry (seeded with 18 functions),
-- edge_function_invocations (populated by shared invocation-logger).
-- DO NOT modify existing edge functions, tables, components, or RLS policies.

-- ── 1. edge_function_registry ─────────────────────────────────
CREATE TABLE IF NOT EXISTS edge_function_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'on_demand',
  cron_schedule TEXT,
  cron_job_name TEXT,
  description TEXT,
  expected_duration_ms INT,
  max_consecutive_failures INT NOT NULL DEFAULT 3,
  is_monitored BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_efr_function_name
  ON edge_function_registry (function_name);

-- ── 2. edge_function_invocations ──────────────────────────────
CREATE TABLE IF NOT EXISTS edge_function_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  invoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  status TEXT NOT NULL DEFAULT 'running',
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  triggered_by TEXT,
  request_payload JSONB DEFAULT '{}',
  response_payload JSONB DEFAULT '{}',
  error_type TEXT,
  error_message TEXT,
  error_stack TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_efi_function_invoked
  ON edge_function_invocations (function_name, invoked_at DESC);

CREATE INDEX IF NOT EXISTS idx_efi_status
  ON edge_function_invocations (status, invoked_at DESC);

-- ── updated_at trigger for registry ───────────────────────────
CREATE OR REPLACE FUNCTION update_efr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_efr_updated_at
  BEFORE UPDATE ON edge_function_registry
  FOR EACH ROW EXECUTE FUNCTION update_efr_updated_at();

-- ── RLS policies ──────────────────────────────────────────────
ALTER TABLE edge_function_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_function_invocations ENABLE ROW LEVEL SECURITY;

-- Admin read/write (email ends with @getevidly.com)
DO $$ BEGIN
  EXECUTE format(
    'CREATE POLICY admin_all ON edge_function_registry FOR ALL USING (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'') WITH CHECK (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'')'
  );
  EXECUTE format(
    'CREATE POLICY admin_all ON edge_function_invocations FOR ALL USING (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'') WITH CHECK (auth.jwt() ->> ''email'' LIKE ''%%@getevidly.com'')'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service role bypass (for edge functions writing invocation logs)
DO $$ BEGIN
  EXECUTE 'CREATE POLICY service_role_all ON edge_function_registry FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  EXECUTE 'CREATE POLICY service_role_all ON edge_function_invocations FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Seed registry with 18 functions ───────────────────────────
INSERT INTO edge_function_registry (function_name, category, trigger_type, cron_schedule, cron_job_name, description, expected_duration_ms) VALUES
  -- Track A: External Data Crawl
  ('crawl-code-monitor',         'intelligence_crawl',       'cron',      '0 6 * * *',    'crawl-code-monitor-daily',    'Crawls all intelligence sources, hashes content, creates signals on change',     15000),
  ('intel-crawl-recalls',        'intelligence_crawl',       'cron',      '0 */6 * * *',  'intel-recalls-6h',            'FDA/USDA RSS + API → intel_recalls',                                            5000),
  ('intel-crawl-inspections',    'intelligence_crawl',       'cron',      '0 2 * * *',    'intel-inspections-daily',     'County health dept pages via Firecrawl → intel_public_inspections',              60000),
  ('intel-crawl-environmental',  'intelligence_crawl',       'cron',      '0 * * * *',    'intel-env-hourly',            'NOAA API + CalOSHA → intel_environmental_alerts',                               5000),
  ('intel-crawl-enforcement',    'intelligence_crawl',       'cron',      '0 3 * * 2',    'intel-enforcement-weekly',    'County closure lists + OSHA → intel_enforcement_actions',                       30000),
  ('intel-crawl-benchmarks',     'intelligence_crawl',       'cron',      '0 4 1 * *',    'intel-benchmarks-monthly',    'BLS API + PDF extraction → intel_industry_benchmarks',                          120000),
  ('intel-aggregate-benchmarks', 'intelligence_aggregation', 'cron',      '0 5 * * *',    'intel-agg-benchmarks-daily',  'Aggregates inspections → intel_inspection_benchmarks',                          10000),
  ('intel-aggregate-penalties',  'intelligence_aggregation', 'cron',      '0 4 * * 0',    'intel-agg-penalties-weekly',  'Aggregates enforcement → intel_penalty_benchmarks',                             10000),
  -- Track B: Signal Classification & Communication
  ('triage-signal',              'intelligence_processing',  'on_demand', NULL,            NULL,                          'Claude API classifies signal, creates game plan, routes alerts',                 8000),
  ('route-arthur-alert',         'notification',             'on_demand', NULL,            NULL,                          'Routes game plan to Arthur via SMS/email based on severity',                    3000),
  ('notify-affected-clients',    'notification',             'on_demand', NULL,            NULL,                          'Matches signal to affected orgs, creates client notifications',                 5000),
  ('send-arthur-digest',         'notification',             'cron',      '0 6 * * 1',    'send-arthur-digest-mon',      'Monday morning intelligence briefing email',                                    10000),
  ('send-client-digest',         'notification',             'cron',      '0 7 * * 1',    'send-client-digest-mon',      'Personalized weekly digest to enrolled orgs',                                   30000),
  ('draft-prospect-outreach',    'sales_automation',         'on_demand', NULL,            NULL,                          'Claude API drafts prospect email using signal + penalty data',                  10000),
  -- Platform Core
  ('generate-haccp-plan',        'compliance_generation',    'on_demand', NULL,            NULL,                          'Claude API generates customized HACCP plan',                                    15000),
  ('calculate-fire-safety-score','scoring',                  'on_demand', NULL,            NULL,                          'Reads fire inspection data, outputs fire pillar score',                         3000),
  ('calculate-compliance-score', 'scoring',                  'on_demand', NULL,            NULL,                          'Jurisdiction-native inspection readiness score',                                5000),
  -- Maintenance
  ('intel-refresh-freshness',    'intelligence_maintenance', 'cron',      '0 6 * * *',    'intel-freshness-daily',       'Updates intel_data_freshness for all streams',                                  3000)
ON CONFLICT (function_name) DO NOTHING;

-- ── 90-day data retention cleanup (pg_cron) ───────────────────
-- Run this manually in the Supabase SQL editor to schedule the cleanup:
-- SELECT cron.schedule(
--   'cleanup-edge-fn-invocations',
--   '0 3 1 * *',
--   $$DELETE FROM edge_function_invocations WHERE invoked_at < now() - interval '90 days'$$
-- );
