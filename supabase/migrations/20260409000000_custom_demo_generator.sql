-- ============================================================
-- Custom Demo Generator — Personalized Prospect Demos
-- ============================================================

-- Table: demo_sessions
-- Tracks every personalized demo session from prospect intake through conversion
CREATE TABLE IF NOT EXISTS demo_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Who created it
  created_by UUID REFERENCES auth.users(id),
  created_by_type TEXT NOT NULL DEFAULT 'prospect',
  -- Values: 'prospect' (self-serve form), 'sales_rep' (internal admin tool)
  sales_rep_email TEXT,

  -- Prospect info
  prospect_name TEXT NOT NULL,
  prospect_email TEXT NOT NULL,
  prospect_phone TEXT,
  company_name TEXT NOT NULL,
  company_type TEXT,
  -- Values: 'restaurant', 'hotel', 'hospital', 'school_k12', 'university',
  --         'catering', 'ghost_kitchen', 'food_truck', 'corporate_dining', 'other'

  -- Location info (used to configure jurisdiction)
  location_id UUID,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  county TEXT,
  state TEXT NOT NULL DEFAULT 'CA',
  zip_code TEXT NOT NULL,

  -- Jurisdiction (auto-configured by JIE)
  health_authority TEXT,
  fire_authority TEXT,
  jurisdiction_config_id UUID,

  -- Demo configuration
  num_locations INTEGER DEFAULT 1,
  operation_type TEXT DEFAULT 'moderate',
  -- Values: 'light' (bakery, cafe), 'moderate' (full-service restaurant),
  --         'heavy' (24hr, high-volume), 'institutional' (hospital, school)
  demo_duration_days INTEGER DEFAULT 14,
  include_insights JSONB DEFAULT '["temperature_trends","compliance_progression","inspection_predictions","vendor_reminders","corrective_actions"]',

  -- Demo lifecycle
  status TEXT NOT NULL DEFAULT 'pending_scheduling',
  -- Values: 'pending_scheduling', 'scheduled', 'generating', 'ready',
  --         'active', 'expired', 'converted', 'deleted'
  scheduled_at TIMESTAMPTZ,
  calendly_event_url TEXT,
  assigned_rep_email TEXT,
  expires_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- Conversion
  assigned_plan TEXT,
  -- Values: 'founder', 'standard', 'enterprise'

  -- Tracking
  last_accessed_at TIMESTAMPTZ,
  total_logins INTEGER DEFAULT 0,
  pages_visited JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist (table may have been created by an earlier migration with fewer columns)
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS created_by_type TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS sales_rep_email TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS prospect_name TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS prospect_email TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS prospect_phone TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS company_type TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS location_id UUID;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'CA';
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS health_authority TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS fire_authority TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS jurisdiction_config_id UUID;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS num_locations INTEGER DEFAULT 1;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS operation_type TEXT DEFAULT 'moderate';
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS demo_duration_days INTEGER DEFAULT 14;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS include_insights JSONB;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS calendly_event_url TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS assigned_rep_email TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS assigned_plan TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS total_logins INTEGER DEFAULT 0;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS pages_visited JSONB DEFAULT '[]';
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS county TEXT;

ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own demo" ON demo_sessions;
CREATE POLICY "Users see own demo" ON demo_sessions
  FOR SELECT USING (created_by = auth.uid() OR prospect_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins see all demos" ON demo_sessions;
CREATE POLICY "Admins see all demos" ON demo_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'admin', 'owner_operator', 'platform_admin')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create demos" ON demo_sessions;
CREATE POLICY "Authenticated users can create demos" ON demo_sessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can update demos" ON demo_sessions;
CREATE POLICY "Admins can update demos" ON demo_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'admin', 'owner_operator', 'platform_admin')
    )
  );

-- ── Table: demo_generated_data ─────────────────────────────
-- Tracks every row generated by a demo so it can be cleanly deleted on conversion
CREATE TABLE IF NOT EXISTS demo_generated_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_session_id UUID REFERENCES demo_sessions(id) ON DELETE CASCADE,
  target_table TEXT NOT NULL,
  target_row_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE demo_generated_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage demo data" ON demo_generated_data;
CREATE POLICY "Admins manage demo data" ON demo_generated_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'admin', 'owner_operator', 'platform_admin')
    )
  );

-- ── Table: competitor_blocked_domains ──────────────────────
CREATE TABLE IF NOT EXISTS competitor_blocked_domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  company_name TEXT,
  reason TEXT DEFAULT 'competitor',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with known competitors
INSERT INTO competitor_blocked_domains (domain, company_name) VALUES
  ('zenput.com', 'Zenput/Crunchtime'),
  ('crunchtime.com', 'Crunchtime'),
  ('compliancetrak.com', 'ComplianceTrak'),
  ('jfranco.com', 'J. Franco'),
  ('steritech.com', 'Steritech'),
  ('ecosure.com', 'EcoSure'),
  ('safefoodalliance.com', 'Safe Food Alliance'),
  ('francoisassociates.com', 'Francois Associates')
ON CONFLICT (domain) DO NOTHING;

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_demo_sessions_status ON demo_sessions(status);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_email ON demo_sessions(prospect_email);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires ON demo_sessions(expires_at) WHERE status IN ('ready', 'active');
CREATE INDEX IF NOT EXISTS idx_demo_generated_session ON demo_generated_data(demo_session_id);

-- ── Auto-expiration helper (run via cron or Edge Function) ──
-- UPDATE demo_sessions SET status = 'expired'
-- WHERE status IN ('ready', 'active') AND expires_at < NOW();
--
-- UPDATE demo_sessions SET status = 'expired'
-- WHERE status = 'scheduled' AND scheduled_at < NOW() - INTERVAL '30 days';
