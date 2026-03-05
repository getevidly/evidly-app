-- ============================================================
-- K2C billing columns + platform_metrics_daily table
-- ============================================================

-- K2C billing tracking columns
ALTER TABLE k2c_donations ADD COLUMN IF NOT EXISTS billing_event_id TEXT;
ALTER TABLE k2c_donations ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS k2c_billing_event_idx ON k2c_donations (billing_event_id);

-- Platform metrics daily snapshots
CREATE TABLE IF NOT EXISTS platform_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  temp_logs_count INT DEFAULT 0,
  checklists_count INT DEFAULT 0,
  docs_uploaded_count INT DEFAULT 0,
  corrective_actions_count INT DEFAULT 0,
  incidents_count INT DEFAULT 0,
  equipment_count INT DEFAULT 0,
  organizations_count INT DEFAULT 0,
  locations_count INT DEFAULT 0,
  time_saved_hours INT DEFAULT 0,
  money_saved_cents INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_metrics_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_only" ON platform_metrics_daily;
CREATE POLICY "admin_only" ON platform_metrics_daily
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

CREATE INDEX IF NOT EXISTS idx_metrics_date ON platform_metrics_daily (metric_date DESC);

-- View for landing page stats (PlatformStats component)
CREATE OR REPLACE VIEW v_platform_stats AS
SELECT
  (SELECT count(*) FROM locations) AS total_locations,
  (SELECT count(*) FROM documents) AS total_documents,
  (SELECT count(*) FROM temp_logs) AS total_temp_logs,
  (SELECT count(*) FROM checklist_completions) AS total_checklists,
  COALESCE((SELECT time_saved_hours FROM platform_metrics_daily ORDER BY metric_date DESC LIMIT 1), 0) AS total_hours_saved,
  COALESCE((SELECT money_saved_cents / 100 FROM platform_metrics_daily ORDER BY metric_date DESC LIMIT 1), 0) AS total_money_saved;

-- Admin security config table (for domain security policy)
CREATE TABLE IF NOT EXISTS admin_security_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE admin_security_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_only" ON admin_security_config;
CREATE POLICY "admin_only" ON admin_security_config
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

-- Seed domain security config
INSERT INTO admin_security_config (config_key, config_value) VALUES
  ('domain_security', '{
    "enforce_https": true,
    "hsts_enabled": true,
    "hsts_max_age_seconds": 31536000,
    "hsts_include_subdomains": true,
    "content_security_policy": "default-src ''self''; script-src ''self'' ''unsafe-inline''; style-src ''self'' ''unsafe-inline''; img-src ''self'' data: https:; connect-src ''self'' https://*.supabase.co wss://*.supabase.co;",
    "x_frame_options": "DENY",
    "x_content_type_options": "nosniff",
    "referrer_policy": "strict-origin-when-cross-origin",
    "allowed_domains": ["getevidly.com", "evidly-app.vercel.app", "cleaningprosplus.com", "filtafryer.com", "scoretable.com"],
    "cors_origins": ["https://getevidly.com", "https://evidly-app.vercel.app"],
    "cookie_secure": true,
    "cookie_samesite": "Strict"
  }')
ON CONFLICT (config_key) DO NOTHING;
