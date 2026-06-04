/*
 * 20260604000002_class_1b_tables.sql
 *
 * Creates 28 CLASS 1B tables identified in C21 Interface Configuration Audit.
 * All 28 have active code write/read paths but were never created in PROD.
 *
 * Plain DDL only — no DO blocks, no exception swallowing.
 * Dependency-ordered: standalone tables first, FK-dependent tables after.
 *
 * FK RESOLUTION:
 *   KEPT   → organizations, locations, auth.users, user_profiles,
 *            intelligence_signals, feature_flags, drift_catches,
 *            demo_sessions
 *   DROPPED → iot_sensor_providers, integrations, enterprise_tenants,
 *             enterprise_report_templates, master_checklist_definitions,
 *             temperature_equipment
 *             (zero code refs or PROD status uncertain)
 */

-- ══════════════════════════════════════════════════════════════
-- GROUP 1: PLATFORM SETTINGS & CONFIG (standalone, no FKs)
-- ══════════════════════════════════════════════════════════════

-- 1/28 platform_settings
CREATE TABLE IF NOT EXISTS platform_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_by text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ps_admin_all ON platform_settings
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

CREATE POLICY ps_service ON platform_settings
  FOR ALL TO service_role
  USING (true);

-- 2/28 ai_budget_config
CREATE TABLE IF NOT EXISTS ai_budget_config (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_budget_usd   numeric(10,2) DEFAULT 10.00,
  monthly_budget_usd numeric(10,2) DEFAULT 100.00,
  alert_threshold_pct integer DEFAULT 80,
  alert_email        text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

ALTER TABLE ai_budget_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_manage_budget ON ai_budget_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- 3/28 admin_security_config
CREATE TABLE IF NOT EXISTS admin_security_config (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key   text NOT NULL UNIQUE,
  config_value jsonb NOT NULL,
  updated_at   timestamptz DEFAULT now(),
  updated_by   uuid REFERENCES auth.users(id)
);

ALTER TABLE admin_security_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_only_asc ON admin_security_config
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

-- 4/28 mfa_policy
CREATE TABLE IF NOT EXISTS mfa_policy (
  role              text PRIMARY KEY,
  mfa_required      boolean DEFAULT false,
  grace_period_days integer DEFAULT 7,
  enforce_at        timestamptz
);

ALTER TABLE mfa_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_manage_mfa_policy ON mfa_policy
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

CREATE POLICY authenticated_read_mfa_policy ON mfa_policy
  FOR SELECT USING (auth.role() = 'authenticated');

-- 5/28 session_policy
CREATE TABLE IF NOT EXISTS session_policy (
  role                   text PRIMARY KEY,
  idle_timeout_minutes   integer DEFAULT 60,
  absolute_timeout_hours integer DEFAULT 24,
  admin_timeout_minutes  integer DEFAULT 30
);

ALTER TABLE session_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_manage_session_policy ON session_policy
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

CREATE POLICY authenticated_read_session_policy ON session_policy
  FOR SELECT USING (auth.role() = 'authenticated');


-- ══════════════════════════════════════════════════════════════
-- GROUP 2: USER-SCOPED TABLES (FK to auth.users only)
-- ══════════════════════════════════════════════════════════════

-- 6/28 user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token  text UNIQUE NOT NULL,
  ip_address     inet,
  user_agent     text,
  created_at     timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  revoked_at     timestamptz,
  revoke_reason  text
);

CREATE INDEX IF NOT EXISTS idx_sessions_user  ON user_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_read_own_sessions ON user_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY admin_manage_sessions ON user_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

CREATE POLICY service_role_manage_sessions ON user_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- 7/28 user_mfa_config
CREATE TABLE IF NOT EXISTS user_mfa_config (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  mfa_enabled            boolean DEFAULT false,
  mfa_type               text CHECK (mfa_type IN ('totp', 'sms')) DEFAULT 'totp',
  enrolled_at            timestamptz,
  last_used_at           timestamptz,
  backup_codes_generated boolean DEFAULT false,
  backup_codes_used      integer DEFAULT 0,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

ALTER TABLE user_mfa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_manage_own_mfa ON user_mfa_config
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY admin_read_all_mfa ON user_mfa_config
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );


-- ══════════════════════════════════════════════════════════════
-- GROUP 3: INTELLIGENCE PIPELINE (FK to intelligence_signals)
-- ══════════════════════════════════════════════════════════════

-- 8/28 signal_reads
CREATE TABLE IF NOT EXISTS signal_reads (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES intelligence_signals(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(signal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_signal_reads_user   ON signal_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_signal_reads_signal ON signal_reads(signal_id);

ALTER TABLE signal_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_manage_own_reads ON signal_reads
  FOR ALL USING (user_id = auth.uid());

-- 9/28 signal_review_log
CREATE TABLE IF NOT EXISTS signal_review_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id   uuid NOT NULL REFERENCES intelligence_signals(id) ON DELETE CASCADE,
  action      text NOT NULL CHECK (action IN (
    'approve', 'approve_subset', 'edit', 'reject', 'hold',
    'preview_sent', 'restore', 'edit_approve', 'create'
  )),
  actor_id    uuid REFERENCES auth.users(id),
  actor_email text,
  notes       text,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_srl_signal ON signal_review_log(signal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_srl_actor  ON signal_review_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_srl_action ON signal_review_log(action, created_at DESC);

ALTER TABLE signal_review_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY srl_admin_all ON signal_review_log
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

CREATE POLICY srl_service ON signal_review_log
  FOR ALL TO service_role
  USING (true);

-- 10/28 client_advisories
CREATE TABLE IF NOT EXISTS client_advisories (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid REFERENCES organizations(id) ON DELETE CASCADE,
  signal_id           uuid REFERENCES intelligence_signals(id) ON DELETE SET NULL,
  title               text NOT NULL,
  summary             text NOT NULL,
  dimension           text NOT NULL DEFAULT 'operational'
                      CHECK (dimension IN ('revenue','liability','cost','operational')),
  risk_level          text NOT NULL DEFAULT 'medium'
                      CHECK (risk_level IN ('critical','high','medium','low','informational')),
  advisory_type       text NOT NULL DEFAULT 'risk'
                      CHECK (advisory_type IN ('risk','opportunity','update','action_required')),
  affected_locations  uuid[] DEFAULT '{}',
  recommended_actions jsonb DEFAULT '[]',
  published_at        timestamptz DEFAULT now(),
  published_by        text,
  expires_at          timestamptz,
  is_active           boolean DEFAULT true,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisories_org       ON client_advisories(org_id);
CREATE INDEX IF NOT EXISTS idx_advisories_dimension ON client_advisories(dimension);
CREATE INDEX IF NOT EXISTS idx_advisories_active    ON client_advisories(is_active) WHERE is_active = true;

ALTER TABLE client_advisories ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_only_advisories ON client_advisories
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

CREATE POLICY service_role_advisories ON client_advisories
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY tenant_read_advisories ON client_advisories
  FOR SELECT USING (
    org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- 11/28 risk_plans
CREATE TABLE IF NOT EXISTS risk_plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  signal_id        uuid NOT NULL REFERENCES intelligence_signals(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'not_started'
                   CHECK (status IN ('not_started', 'in_progress', 'completed', 'accepted')),
  owner_name       text,
  due_date         date,
  mitigation_steps text,
  accepted_reason  text,
  notes            text,
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (org_id, signal_id)
);

CREATE INDEX IF NOT EXISTS idx_rp_org        ON risk_plans(org_id);
CREATE INDEX IF NOT EXISTS idx_rp_signal     ON risk_plans(signal_id);
CREATE INDEX IF NOT EXISTS idx_rp_org_status ON risk_plans(org_id, status);

ALTER TABLE risk_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_members_manage_risk_plans ON risk_plans
  FOR ALL USING (
    org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY service_role_risk_plans ON risk_plans
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_risk_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS risk_plans_updated_at ON risk_plans;
CREATE TRIGGER risk_plans_updated_at
  BEFORE UPDATE ON risk_plans
  FOR EACH ROW EXECUTE FUNCTION update_risk_plans_updated_at();


-- ══════════════════════════════════════════════════════════════
-- GROUP 4: ORG-SCOPED OPERATIONAL TABLES
-- ══════════════════════════════════════════════════════════════

-- 12/28 workforce_risk_signals
CREATE TABLE IF NOT EXISTS workforce_risk_signals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     uuid REFERENCES locations(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  signal_type     varchar(50) NOT NULL CHECK (signal_type IN (
    'food_handler_cert_expired', 'food_handler_cert_expiring_soon',
    'cfpm_cert_expired', 'cfpm_cert_expiring_soon',
    'training_incomplete', 'role_cert_gap',
    'fire_safety_training_missing', 'fire_extinguisher_training_missing',
    'high_turnover_flag'
  )),
  affected_count  integer DEFAULT 1,
  details         jsonb DEFAULT '{}',
  resolved_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workforce_signals_org
  ON workforce_risk_signals(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workforce_signals_unresolved
  ON workforce_risk_signals(organization_id) WHERE resolved_at IS NULL;

ALTER TABLE workforce_risk_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_view_workforce_signals ON workforce_risk_signals
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- 13/28 internal_reports
CREATE TABLE IF NOT EXISTS internal_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type   text NOT NULL CHECK (report_type IN (
    'internal_weekly','internal_monthly','internal_quarterly',
    'client_compliance','client_executive','client_insurance',
    'client_vendor','client_regulatory','client_training',
    'partner_portfolio','partner_risk','partner_performance',
    'investor_mrr','investor_growth','investor_product'
  )),
  title         text NOT NULL,
  period_start  date,
  period_end    date,
  org_id        uuid REFERENCES organizations(id) ON DELETE SET NULL,
  generated_by  text,
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','generating','ready','published','archived')),
  content_json  jsonb DEFAULT '{}',
  share_token   text UNIQUE,
  share_expires timestamptz,
  pdf_url       text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_type  ON internal_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_org   ON internal_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_reports_token ON internal_reports(share_token) WHERE share_token IS NOT NULL;

ALTER TABLE internal_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_only_reports ON internal_reports
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

CREATE POLICY service_role_reports ON internal_reports
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY tenant_read_reports ON internal_reports
  FOR SELECT USING (
    org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    AND status IN ('ready', 'published')
  );

-- 14/28 feature_flag_notifications
CREATE TABLE IF NOT EXISTS feature_flag_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key    text NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  UNIQUE(flag_key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ffn_flag_key ON feature_flag_notifications(flag_key);
CREATE INDEX IF NOT EXISTS idx_ffn_user_id  ON feature_flag_notifications(user_id);

ALTER TABLE feature_flag_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_manage_own_notifications ON feature_flag_notifications
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY admin_manage_all_notifications ON feature_flag_notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );


-- ══════════════════════════════════════════════════════════════
-- GROUP 5: COMPLIANCE MODULES
-- ══════════════════════════════════════════════════════════════

-- 15/28 sb1383_compliance
CREATE TABLE IF NOT EXISTS sb1383_compliance (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                 uuid REFERENCES organizations(id) ON DELETE CASCADE,
  location_id                     uuid REFERENCES locations(id) ON DELETE CASCADE,
  reporting_period                text NOT NULL,
  edible_food_recovery_lbs        numeric DEFAULT 0,
  organic_waste_diverted_lbs      numeric DEFAULT 0,
  food_recovery_partner           text,
  food_recovery_partner_contact   text,
  food_recovery_agreement_on_file boolean DEFAULT false,
  hauler_name                     text,
  hauler_service_frequency        text,
  hauler_provides_organics        boolean DEFAULT false,
  weight_tickets_on_file          boolean DEFAULT false,
  generator_tier                  integer,
  recovery_plan_on_file           boolean DEFAULT false,
  last_inspection_date            date,
  inspection_notes                text,
  notes                           text,
  created_by                      uuid REFERENCES user_profiles(id),
  created_at                      timestamptz DEFAULT now(),
  updated_at                      timestamptz DEFAULT now()
);

ALTER TABLE sb1383_compliance ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_access_sb1383 ON sb1383_compliance
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- 16/28 nslp_claim_periods
CREATE TABLE IF NOT EXISTS nslp_claim_periods (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid REFERENCES organizations(id) ON DELETE CASCADE,
  location_id        uuid REFERENCES locations(id) ON DELETE CASCADE,
  claim_period       text NOT NULL,
  meal_count_total   integer,
  meal_count_daily_avg numeric,
  claim_submitted    boolean DEFAULT false,
  claim_submitted_at timestamptz,
  notes              text,
  created_by         uuid REFERENCES user_profiles(id),
  created_at         timestamptz DEFAULT now()
);

ALTER TABLE nslp_claim_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_access_nslp ON nslp_claim_periods
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );


-- ══════════════════════════════════════════════════════════════
-- GROUP 6: IoT & INTEGRATIONS
-- ══════════════════════════════════════════════════════════════

-- 17/28 iot_sensors
-- FK DROPPED: iot_sensor_providers(slug) — zero code refs, likely not in PROD
-- FK DROPPED: temperature_equipment(id) — PROD status uncertain
CREATE TABLE IF NOT EXISTS iot_sensors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id     uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  provider_slug   text NOT NULL,
  name            text NOT NULL,
  mac_address     text NOT NULL,
  sensor_type     text NOT NULL CHECK (sensor_type IN ('temperature', 'humidity', 'combo', 'pressure')),
  zone            text,
  equipment_id    uuid,
  battery_pct     integer DEFAULT 100,
  signal_rssi     integer DEFAULT 0,
  firmware        text,
  status          text NOT NULL DEFAULT 'offline'
                  CHECK (status IN ('online', 'offline', 'warning', 'error')),
  last_seen_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(organization_id, mac_address)
);

CREATE INDEX IF NOT EXISTS idx_iot_sensors_org      ON iot_sensors(organization_id);
CREATE INDEX IF NOT EXISTS idx_iot_sensors_location ON iot_sensors(location_id);
CREATE INDEX IF NOT EXISTS idx_iot_sensors_status   ON iot_sensors(status);

ALTER TABLE iot_sensors ENABLE ROW LEVEL SECURITY;

CREATE POLICY iot_sensors_org_read ON iot_sensors
  FOR SELECT TO authenticated USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY iot_sensors_org_insert ON iot_sensors
  FOR INSERT TO authenticated WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY iot_sensors_org_update ON iot_sensors
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY iot_sensors_service ON iot_sensors
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 18/28 integration_connections
-- FK DROPPED: integrations(id) — zero code refs, PROD status uncertain
CREATE TABLE IF NOT EXISTS integration_connections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL,
  status         text NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','paused','error','disconnected')),
  config         jsonb NOT NULL DEFAULT '{}',
  connected_by   uuid REFERENCES auth.users(id),
  connected_at   timestamptz NOT NULL DEFAULT now(),
  last_sync_at   timestamptz,
  UNIQUE(org_id, integration_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_org ON integration_connections(org_id);

ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_connections_org_access ON integration_connections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.organization_id = integration_connections.org_id
        AND user_profiles.role IN ('platform_admin','owner_operator','executive')
    )
  );


-- ══════════════════════════════════════════════════════════════
-- GROUP 7: SALES & GTM (admin-only)
-- ══════════════════════════════════════════════════════════════

-- 19/28 demo_leads
CREATE TABLE IF NOT EXISTS demo_leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz DEFAULT now(),
  full_name         text NOT NULL,
  email             text NOT NULL,
  phone             text,
  organization_name text,
  industry_type     text,
  industry_subtype  text,
  location_type     text,
  location_count    int,
  location_name     text
);

ALTER TABLE demo_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_insert_demo_leads ON demo_leads
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY service_role_select_demo_leads ON demo_leads
  FOR SELECT TO service_role USING (true);

CREATE POLICY admin_read_demo_leads ON demo_leads
  FOR SELECT TO authenticated USING (
    auth.jwt() ->> 'email' LIKE '%@getevidly.com'
  );

-- 20/28 guided_tour_templates
CREATE TABLE IF NOT EXISTS guided_tour_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  description      text,
  target_segment   text NOT NULL CHECK (target_segment IN (
    'restaurant_single','restaurant_multi','hospitality','healthcare',
    'institutional','enterprise','default'
  )),
  county           text,
  industry         text,
  modules_enabled  text[] DEFAULT '{}',
  demo_locations   jsonb DEFAULT '[]',
  talking_points   jsonb DEFAULT '[]',
  duration_minutes int DEFAULT 20,
  is_active        boolean DEFAULT true,
  created_by       text,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_templates_segment ON guided_tour_templates(target_segment);

ALTER TABLE guided_tour_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_only_gtt ON guided_tour_templates
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

CREATE POLICY service_role_gtt ON guided_tour_templates
  FOR ALL USING (auth.role() = 'service_role');

-- 21/28 marketing_campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  channel        text NOT NULL CHECK (channel IN (
    'email','linkedin','cold_call','event','referral',
    'seo','paid_ads','partner','direct','other'
  )),
  target_segment text,
  status         text DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  start_date     date,
  end_date       date,
  budget_cents   int DEFAULT 0,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_only_mc ON marketing_campaigns
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

CREATE POLICY service_role_mc ON marketing_campaigns
  FOR ALL USING (auth.role() = 'service_role');

-- 22/28 sales_pipeline
CREATE TABLE IF NOT EXISTS sales_pipeline (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid REFERENCES demo_sessions(id),
  lead_id             uuid,
  org_name            text NOT NULL,
  contact_name        text,
  contact_email       text,
  contact_title       text,
  segment             text,
  industry            text,
  location_count      int DEFAULT 1,
  estimated_mrr_cents int DEFAULT 0,
  stage               text NOT NULL DEFAULT 'prospect' CHECK (stage IN (
    'prospect','tour_scheduled','tour_completed',
    'proposal_sent','negotiating','won','lost','churned'
  )),
  probability_pct     int DEFAULT 10,
  expected_close_date date,
  won_date            date,
  lost_date           date,
  lost_reason         text,
  notes               text,
  assigned_to         text DEFAULT 'arthur@getevidly.com',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_pipeline_stage ON sales_pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_mrr   ON sales_pipeline(estimated_mrr_cents DESC);

ALTER TABLE sales_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_only_sp ON sales_pipeline
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

CREATE POLICY service_role_sp ON sales_pipeline
  FOR ALL USING (auth.role() = 'service_role');


-- ══════════════════════════════════════════════════════════════
-- GROUP 8: VENDOR / LOCATION
-- ══════════════════════════════════════════════════════════════

-- 23/28 location_custom_vendors (no migration file — derived from code)
CREATE TABLE IF NOT EXISTS location_custom_vendors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id  uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  vendor_name  text NOT NULL,
  last_used_at timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(location_id, vendor_name)
);

CREATE INDEX IF NOT EXISTS idx_lcv_location ON location_custom_vendors(location_id);

ALTER TABLE location_custom_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY lcv_org_access ON location_custom_vendors
  FOR ALL USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN user_profiles up ON up.organization_id = l.organization_id
      WHERE up.id = auth.uid()
    )
  );


-- ══════════════════════════════════════════════════════════════
-- GROUP 9: PLATFORM ADMIN TOOLS
-- ══════════════════════════════════════════════════════════════

-- 24/28 admin_backups (no migration file — derived from code)
CREATE TABLE IF NOT EXISTS admin_backups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type  text NOT NULL,
  status       text NOT NULL DEFAULT 'pending',
  triggered_by text,
  size_bytes   bigint,
  duration_ms  integer,
  notes        text,
  started_at   timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE admin_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_only_backups ON admin_backups
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

CREATE POLICY service_role_backups ON admin_backups
  FOR ALL USING (auth.role() = 'service_role');

-- 25/28 system_messages (no migration file — derived from code)
CREATE TABLE IF NOT EXISTS system_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  body             text NOT NULL,
  message_type     text NOT NULL DEFAULT 'info'
                   CHECK (message_type IN ('info','warning','critical','feature')),
  display_style    text NOT NULL DEFAULT 'banner'
                   CHECK (display_style IN ('banner','modal','toast')),
  target_audience  text NOT NULL DEFAULT 'all'
                   CHECK (target_audience IN ('all','owners','admins','trial')),
  is_active        boolean DEFAULT true,
  is_dismissible   boolean DEFAULT true,
  views_count      integer DEFAULT 0,
  dismissals_count integer DEFAULT 0,
  scheduled_at     timestamptz,
  expires_at       timestamptz,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_only_messages ON system_messages
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

CREATE POLICY service_role_messages ON system_messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY authenticated_read_active_messages ON system_messages
  FOR SELECT TO authenticated USING (is_active = true);


-- ══════════════════════════════════════════════════════════════
-- GROUP 10: NAME-MISMATCH TABLES (audit listed wrong name)
-- ══════════════════════════════════════════════════════════════

-- 26/28 drift_acknowledgments (audit listed as drift_catch_acknowledgements)
CREATE TABLE IF NOT EXISTS drift_acknowledgments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  drift_catch_id  uuid NOT NULL REFERENCES drift_catches(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN (
    'owner_operator', 'executive', 'compliance_manager',
    'facilities_manager', 'chef', 'kitchen_manager'
  )),
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  notes           text,
  CONSTRAINT uq_drift_ack_user_role UNIQUE (drift_catch_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_drift_acks_catch ON drift_acknowledgments(drift_catch_id);
CREATE INDEX IF NOT EXISTS idx_drift_acks_user  ON drift_acknowledgments(user_id, acknowledged_at DESC);

ALTER TABLE drift_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY drift_acks_select_org ON drift_acknowledgments
  FOR SELECT USING (
    org_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY drift_acks_insert_own ON drift_acknowledgments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND org_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- 27/28 enterprise_report_schedules (audit listed as report_schedules)
-- FK DROPPED: enterprise_tenants(id) — PROD status uncertain
-- FK DROPPED: enterprise_report_templates(id) — PROD status uncertain
CREATE TABLE IF NOT EXISTS enterprise_report_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  template_id   uuid NOT NULL,
  schedule_type text NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
  recipients    jsonb DEFAULT '[]',
  filters       jsonb DEFAULT '{}',
  next_run_at   timestamptz,
  last_run_at   timestamptz,
  enabled       boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ers_tenant   ON enterprise_report_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ers_template ON enterprise_report_schedules(template_id);

ALTER TABLE enterprise_report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_only_ers ON enterprise_report_schedules
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

CREATE POLICY service_role_ers ON enterprise_report_schedules
  FOR ALL USING (auth.role() = 'service_role');

-- 28/28 customer_checklist_instances (audit listed as checklist_instances)
-- FK DROPPED: master_checklist_definitions(id) — PROD status uncertain
CREATE TABLE IF NOT EXISTS customer_checklist_instances (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  master_definition_id  uuid NOT NULL,
  name_override         text,
  cadence_override      text CHECK (cadence_override IS NULL OR cadence_override IN (
    'once_daily','multiple_daily','per_shift',
    'weekly','monthly','quarterly','on_demand'
  )),
  active_days           text NOT NULL DEFAULT 'MTWRFSU'
                        CHECK (length(active_days) > 0
                          AND translate(active_days, 'MTWRFSU', '') = ''),
  due_windows           jsonb NOT NULL DEFAULT '[]'::jsonb,
  master_version_pinned text NOT NULL DEFAULT '1.0',
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, master_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_cci_org        ON customer_checklist_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_cci_master_def ON customer_checklist_instances(master_definition_id);

ALTER TABLE customer_checklist_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY cci_org_isolation ON customer_checklist_instances
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );


-- ══════════════════════════════════════════════════════════════
-- SEED DATA (policy config tables only)
-- ══════════════════════════════════════════════════════════════

INSERT INTO mfa_policy (role, mfa_required, grace_period_days) VALUES
  ('platform_admin',     true,  0),
  ('owner_operator',     false, 30),
  ('executive',          false, 30),
  ('compliance_officer', false, 30),
  ('facilities',         false, 30),
  ('chef',               false, 30),
  ('kitchen_manager',    false, 30),
  ('kitchen_staff',      false, 30)
ON CONFLICT (role) DO NOTHING;

INSERT INTO session_policy (role, idle_timeout_minutes, absolute_timeout_hours, admin_timeout_minutes) VALUES
  ('platform_admin',     15,  8,  15),
  ('owner_operator',     60,  24, 30),
  ('executive',          60,  24, 30),
  ('compliance_officer', 60,  24, 30),
  ('facilities',         120, 48, 60),
  ('chef',               120, 48, 60),
  ('kitchen_manager',    120, 48, 60),
  ('kitchen_staff',      240, 72, 60)
ON CONFLICT (role) DO NOTHING;

INSERT INTO platform_settings (key, value)
VALUES ('intelligence_routing_mode', '"supervised"'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO ai_budget_config (daily_budget_usd, monthly_budget_usd, alert_threshold_pct)
VALUES (10.00, 100.00, 80)
ON CONFLICT DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- MIGRATION TRACKER
-- ══════════════════════════════════════════════════════════════
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260604000002')
ON CONFLICT DO NOTHING;
