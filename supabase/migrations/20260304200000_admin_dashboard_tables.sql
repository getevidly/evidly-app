-- ============================================================
-- ADMIN-DASHBOARD — Platform admin tables
-- ============================================================

-- API Keys table
CREATE TABLE IF NOT EXISTS admin_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_preview TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('full','read','write','demo')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','revoked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- Assessment leads
CREATE TABLE IF NOT EXISTS assessment_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  county TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  account_type TEXT CHECK (account_type IN ('single','multi-unit','enterprise')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','demo_scheduled','converted','lost')),
  locations_count INT DEFAULT 1,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crawl health tracking
CREATE TABLE IF NOT EXISTS crawl_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id TEXT NOT NULL UNIQUE,
  feed_name TEXT NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('food_safety','fire_safety')),
  status TEXT NOT NULL CHECK (status IN ('live','timeout','waf_block','error','pending')),
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  last_success_at TIMESTAMPTZ,
  response_ms INT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  content_hash TEXT,
  jurisdiction_id TEXT,
  auto_retry_at TIMESTAMPTZ
);

-- Crawl runs log
CREATE TABLE IF NOT EXISTS crawl_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT DEFAULT 'scheduled' CHECK (run_type IN ('scheduled','manual','retry')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  feeds_total INT DEFAULT 0,
  feeds_live INT DEFAULT 0,
  feeds_failed INT DEFAULT 0,
  feeds_changed INT DEFAULT 0,
  duration_ms INT,
  triggered_by TEXT DEFAULT 'pg_cron'
);

-- Platform event log
CREATE TABLE IF NOT EXISTS admin_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_time TIMESTAMPTZ DEFAULT now(),
  level TEXT NOT NULL CHECK (level IN ('INFO','WARN','ERROR','DEBUG')),
  category TEXT,
  message TEXT NOT NULL,
  metadata JSONB,
  user_id UUID REFERENCES auth.users(id)
);

-- Demo sessions
CREATE TABLE IF NOT EXISTS demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  county TEXT,
  user_email TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  duration_seconds INT DEFAULT 0,
  instance_id TEXT
);

-- K2C tracking
CREATE TABLE IF NOT EXISTS k2c_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  account_name TEXT NOT NULL,
  county TEXT,
  amount_cents INT NOT NULL,
  meals_count INT NOT NULL,
  donation_period DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE admin_api_keys   ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_health     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_runs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_event_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE k2c_donations    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only" ON admin_api_keys   FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');
CREATE POLICY "admin_only" ON assessment_leads FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');
CREATE POLICY "admin_only" ON crawl_health     FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');
CREATE POLICY "admin_only" ON crawl_runs       FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');
CREATE POLICY "admin_only" ON admin_event_log  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');
CREATE POLICY "admin_only" ON demo_sessions    FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');
CREATE POLICY "admin_only" ON k2c_donations    FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

-- Seed crawl_health with 37 known feeds
INSERT INTO crawl_health (feed_id, feed_name, pillar, status, jurisdiction_id) VALUES
  ('cdph_la',          'CDPH — Los Angeles',     'food_safety', 'pending', 'la_county'),
  ('cdph_sd',          'CDPH — San Diego',       'food_safety', 'pending', 'san_diego'),
  ('cdph_merced',      'CDPH — Merced',          'food_safety', 'pending', 'merced'),
  ('cdph_fresno',      'CDPH — Fresno',          'food_safety', 'pending', 'fresno'),
  ('cdph_sacramento',  'CDPH — Sacramento',      'food_safety', 'pending', 'sacramento'),
  ('cdph_sfbay',       'CDPH — SF Bay Area',     'food_safety', 'pending', 'san_francisco'),
  ('cdph_kern',        'CDPH — Kern',            'food_safety', 'pending', 'kern'),
  ('cdph_riverside',   'CDPH — Riverside',       'food_safety', 'pending', 'riverside'),
  ('cdph_sbernardino', 'CDPH — San Bernardino',  'food_safety', 'pending', 'san_bernardino'),
  ('cdph_orange',      'CDPH — Orange County',   'food_safety', 'pending', 'orange'),
  ('cdph_ventura',     'CDPH — Ventura',         'food_safety', 'pending', 'ventura'),
  ('cdph_stanislaus',  'CDPH — Stanislaus',      'food_safety', 'pending', 'stanislaus'),
  ('cdph_sj',          'CDPH — San Joaquin',     'food_safety', 'pending', 'san_joaquin'),
  ('cdph_kings',       'CDPH — Kings',           'food_safety', 'pending', 'kings'),
  ('mariposa_eh',      'Mariposa County EH',     'food_safety', 'pending', 'mariposa'),
  ('fda_recalls',      'FDA Recalls',            'food_safety', 'pending', NULL),
  ('fda_foodcode',     'FDA Food Code Updates',  'food_safety', 'pending', NULL),
  ('usda_fsis',        'USDA FSIS Alerts',       'food_safety', 'pending', NULL),
  ('cdc_outbreaks',    'CDC Outbreak Reports',   'food_safety', 'pending', NULL),
  ('ca_fire_marshal',  'CA State Fire Marshal',  'fire_safety', 'pending', NULL),
  ('nfpa96',           'NFPA 96 Updates',        'fire_safety', 'pending', NULL),
  ('osha_ca_kitchen',  'OSHA CA Kitchen',        'fire_safety', 'pending', NULL),
  ('nps_yosemite',     'NPS / Yosemite',         'fire_safety', 'pending', 'mariposa'),
  ('fire_la',          'LAFD Fire Prevention',   'fire_safety', 'pending', 'la_county'),
  ('fire_sd',          'SDFD Fire Prevention',   'fire_safety', 'pending', 'san_diego'),
  ('fire_sacramento',  'Sacramento Metro Fire',  'fire_safety', 'pending', 'sacramento'),
  ('fire_fresno',      'Fresno City Fire',       'fire_safety', 'pending', 'fresno'),
  ('fire_merced',      'Merced City Fire',       'fire_safety', 'pending', 'merced'),
  ('fire_stockton',    'Stockton Fire Dept',     'fire_safety', 'pending', 'san_joaquin'),
  ('fire_modesto',     'Modesto Fire Dept',      'fire_safety', 'pending', 'stanislaus'),
  ('epa_ca',           'CA EPA Food Alerts',     'food_safety', 'pending', NULL),
  ('sb1383_ca',        'CA SB 1383 Compliance',  'food_safety', 'pending', NULL),
  ('calcode_updates',  'CalCode Amendments',     'food_safety', 'pending', NULL),
  ('calfire_ops',      'CAL FIRE Operations',    'fire_safety', 'pending', NULL),
  ('icc_ca',           'ICC CA Amendments',      'fire_safety', 'pending', NULL),
  ('nifc_alerts',      'NIFC Fire Alerts',       'fire_safety', 'pending', NULL),
  ('camtc_cert',       'CAMTC Certifications',   'food_safety', 'pending', NULL)
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crawl_health_status ON crawl_health(status);
CREATE INDEX IF NOT EXISTS idx_crawl_runs_started ON crawl_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_log_time ON admin_event_log(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_event_log_level ON admin_event_log(level, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_leads_status ON assessment_leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_active ON demo_sessions(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_k2c_period ON k2c_donations(donation_period DESC);
