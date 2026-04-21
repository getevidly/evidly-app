-- FEATURE-FLAGS-01: Domain security & feature control
-- Admin panel for toggling features, setting criteria, customizing disabled messages

-- ═══════════════════════════════════════════════════════════════════
-- 1. Feature flags master table
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  route text,
  section text,

  -- State
  is_enabled boolean DEFAULT false,

  -- Trigger type
  trigger_type text CHECK (trigger_type IN (
    'always_on',
    'fixed_date',
    'relative_date',
    'rolling_window',
    'event_delay',
    'time_window',
    'fiscal_renewal',
    'criteria'
  )) DEFAULT 'always_on',

  -- Date config (JSONB — shape varies by trigger_type)
  -- fixed_date:    { go_live, timezone, early_access }
  -- relative_date: { days, unit, scope }
  -- rolling_window:{ active_days, window_days, action_type }
  -- event_delay:   { trigger_event, delay_days }
  -- time_window:   { start, end, after_end }
  -- fiscal_renewal:{ unlock_on, prorate }
  date_config jsonb,

  -- Criteria config (array of { type, operator, value, label })
  criteria jsonb DEFAULT '[]'::jsonb,
  criteria_logic text CHECK (criteria_logic IN ('all', 'any')) DEFAULT 'all',

  -- Visibility
  visible_to text CHECK (visible_to IN ('all', 'admin_only', 'role_filtered')) DEFAULT 'all',
  allowed_roles text[],
  plan_tiers text[],

  -- User-facing disabled message
  disabled_message text,
  disabled_message_title text,

  -- Meta
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 2. Per-user unlock tracking
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feature_flag_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text REFERENCES feature_flags(key) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid,
  unlocked_at timestamptz DEFAULT now(),
  unlock_reason text,
  UNIQUE(flag_key, user_id)
);

-- ═══════════════════════════════════════════════════════════════════
-- 3. Audit log
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feature_flag_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text,
  changed_by uuid REFERENCES auth.users(id),
  change_type text,
  old_value jsonb,
  new_value jsonb,
  changed_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 4. Seed core EvidLY features
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO feature_flags (key, name, description, route, section, is_enabled, trigger_type, sort_order) VALUES
  ('dashboard',           'Dashboard',                    'Main operator dashboard',                                        '/dashboard',               'Core',         true,  'always_on',  1),
  ('facility_safety',     'Facility Safety',              'Fire safety pillar — AHJ data, hood/suppression',                '/facility-safety',         'Compliance',   true,  'always_on',  2),
  ('documents',           'Document Vault',               'COI, HACCP, certifications, vendor records',                     '/documents',               'Compliance',   true,  'always_on',  3),
  ('temperature_logs',    'Temperature Logs',             'HACCP temperature monitoring and log history',                   '/temp-logs',               'Compliance',   true,  'always_on',  4),
  ('checklists',          'Checklists',                   'Operational and fire safety checklists',                          '/checklists',              'Compliance',   true,  'always_on',  5),
  ('alerts',              'Alerts',                       'Compliance alerts and safety net notifications',                  '/alerts',                  'Compliance',   true,  'always_on',  6),
  ('intelligence_feed',   'Intelligence Feed',            'AI-generated compliance signals and game plans',                  '/insights/intelligence',   'Intelligence', true,  'always_on',  7),
  ('jurisdiction_intel',  'Jurisdiction Intelligence',    'JIE scoring — displays results as jurisdiction produces them',    '/jurisdiction',            'Intelligence', true,  'always_on',  8),
  ('score_table',         'ScoreTable',                   'The score behind every table — jurisdiction methodology',         '/score-table',             'Intelligence', true,  'always_on',  9),
  ('irr',                 'Inspection Readiness Report',  'Public self-assessment lead magnet',                              '/operations-check',        'Growth',       true,  'always_on', 10),
  ('insurance_risk',      'Insurance Risk Profile',       'CIC carrier-facing risk layer',                                  '/insurance-risk',          'Intelligence', false, 'criteria',  11),
  ('predictive_alerts',   'Predictive Inspection Alerts', 'PREDICT-SP07-01 — AI inspection timing prediction',              '/insights/intelligence',   'Intelligence', false, 'fixed_date',12),
  ('leaderboard',         'Leaderboard',                  'Compliance ranking across locations',                             '/leaderboard',             'Growth',       true,  'always_on', 13),
  ('k2c',                 'Kitchen to Community',         'K2C charitable giving tracker — No Kid Hungry',                   '/k2c',                     'Growth',       true,  'always_on', 14),
  ('violation_outreach',  'Violation Outreach',           'Admin: violation-triggered prospect outreach system',             '/admin/violation-outreach', 'Admin',        true,  'always_on', 15)
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 5. Indexes
-- ═══════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_ff_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_ff_section ON feature_flags(section);
CREATE INDEX IF NOT EXISTS idx_ff_enabled ON feature_flags(is_enabled);
CREATE INDEX IF NOT EXISTS idx_ffu_flag ON feature_flag_unlocks(flag_key);
CREATE INDEX IF NOT EXISTS idx_ffu_user ON feature_flag_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_ffa_flag ON feature_flag_audit(flag_key);

-- ═══════════════════════════════════════════════════════════════════
-- 6. RLS
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_flags" ON feature_flags;
CREATE POLICY "admin_manage_flags" ON feature_flags FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
);
DROP POLICY IF EXISTS "users_read_flags" ON feature_flags;
CREATE POLICY "users_read_flags" ON feature_flags FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin_manage_unlocks" ON feature_flag_unlocks;
CREATE POLICY "admin_manage_unlocks" ON feature_flag_unlocks FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
);
DROP POLICY IF EXISTS "users_read_own_unlocks" ON feature_flag_unlocks;
CREATE POLICY "users_read_own_unlocks" ON feature_flag_unlocks FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_read_audit" ON feature_flag_audit;
CREATE POLICY "admin_read_audit" ON feature_flag_audit FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
);
