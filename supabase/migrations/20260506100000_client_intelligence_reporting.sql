-- ============================================================
-- CLIENT INTELLIGENCE + REPORTING SYSTEM
-- Tables: client_advisories, client_advisory_reads,
--         assessment_intelligence_events, scoretable_views,
--         internal_reports
-- ============================================================

-- ── 1. Client Advisories ─────────────────────────────────
-- Published from intelligence_signals → tenant-facing alerts

CREATE TABLE IF NOT EXISTS client_advisories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid REFERENCES organizations(id) ON DELETE CASCADE,
  signal_id       uuid REFERENCES intelligence_signals(id) ON DELETE SET NULL,
  title           text NOT NULL,
  summary         text NOT NULL,
  dimension       text NOT NULL DEFAULT 'operational'
                  CHECK (dimension IN ('revenue','liability','cost','operational')),
  risk_level      text NOT NULL DEFAULT 'medium'
                  CHECK (risk_level IN ('critical','high','medium','low','informational')),
  advisory_type   text NOT NULL DEFAULT 'risk'
                  CHECK (advisory_type IN ('risk','opportunity','update','action_required')),
  affected_locations uuid[] DEFAULT '{}',
  recommended_actions jsonb DEFAULT '[]',
  published_at    timestamptz DEFAULT now(),
  published_by    text,
  expires_at      timestamptz,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE client_advisories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_only_advisories ON client_advisories;
CREATE POLICY admin_only_advisories ON client_advisories
  FOR ALL USING (
    auth.jwt() ->> 'email' LIKE '%@getevidly.com'
  );

DROP POLICY IF EXISTS service_role_advisories ON client_advisories;
CREATE POLICY service_role_advisories ON client_advisories
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Tenants can read advisories for their org
DROP POLICY IF EXISTS tenant_read_advisories ON client_advisories;
CREATE POLICY tenant_read_advisories ON client_advisories
  FOR SELECT USING (
    org_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ── 2. Client Advisory Reads (mark-as-read tracking) ─────

CREATE TABLE IF NOT EXISTS client_advisory_reads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisory_id  uuid NOT NULL REFERENCES client_advisories(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL DEFAULT auth.uid(),
  read_at      timestamptz DEFAULT now(),
  UNIQUE(advisory_id, user_id)
);

ALTER TABLE client_advisory_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS own_reads ON client_advisory_reads;
CREATE POLICY own_reads ON client_advisory_reads
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS service_role_reads ON client_advisory_reads;
CREATE POLICY service_role_reads ON client_advisory_reads
  FOR ALL USING (auth.role() = 'service_role');

-- ── 3. Assessment Intelligence Events ────────────────────
-- Tracks when public assessments generate intelligence value

CREATE TABLE IF NOT EXISTS assessment_intelligence_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text NOT NULL CHECK (event_type IN (
    'assessment_completed','checkup_completed','k2c_donation',
    'scoretable_conversion','vendor_lead'
  )),
  source_id       text,
  organization_id uuid,
  location_id     uuid,
  county          text,
  industry        text,
  payload         jsonb DEFAULT '{}',
  advisory_generated boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE assessment_intelligence_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_only_aie ON assessment_intelligence_events;
CREATE POLICY admin_only_aie ON assessment_intelligence_events
  FOR ALL USING (
    auth.jwt() ->> 'email' LIKE '%@getevidly.com'
  );

DROP POLICY IF EXISTS service_role_aie ON assessment_intelligence_events;
CREATE POLICY service_role_aie ON assessment_intelligence_events
  FOR ALL USING (auth.role() = 'service_role');

-- ── 4. ScoreTable Views ──────────────────────────────────
-- Track public ScoreTable page views for analytics

CREATE TABLE IF NOT EXISTS scoretable_views (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_slug     text NOT NULL,
  referrer        text,
  user_agent      text,
  ip_hash         text,
  session_id      text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  viewed_at       timestamptz DEFAULT now()
);

ALTER TABLE scoretable_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_only_sv ON scoretable_views;
CREATE POLICY admin_only_sv ON scoretable_views
  FOR ALL USING (
    auth.jwt() ->> 'email' LIKE '%@getevidly.com'
  );

DROP POLICY IF EXISTS service_role_sv ON scoretable_views;
CREATE POLICY service_role_sv ON scoretable_views
  FOR ALL USING (auth.role() = 'service_role');

-- Public insert for anonymous tracking
DROP POLICY IF EXISTS public_insert_sv ON scoretable_views;
CREATE POLICY public_insert_sv ON scoretable_views
  FOR INSERT WITH CHECK (true);

-- ── 5. Internal Reports ──────────────────────────────────
-- Generated reports (internal + client + partner + investor)

CREATE TABLE IF NOT EXISTS internal_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type     text NOT NULL CHECK (report_type IN (
    'internal_weekly','internal_monthly','internal_quarterly',
    'client_compliance','client_executive','client_insurance',
    'client_vendor','client_regulatory','client_training',
    'partner_portfolio','partner_risk','partner_performance',
    'investor_mrr','investor_growth','investor_product'
  )),
  title           text NOT NULL,
  period_start    date,
  period_end      date,
  org_id          uuid REFERENCES organizations(id) ON DELETE SET NULL,
  generated_by    text,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','generating','ready','published','archived')),
  content_json    jsonb DEFAULT '{}',
  share_token     text UNIQUE,
  share_expires   timestamptz,
  pdf_url         text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE internal_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_only_reports ON internal_reports;
CREATE POLICY admin_only_reports ON internal_reports
  FOR ALL USING (
    auth.jwt() ->> 'email' LIKE '%@getevidly.com'
  );

DROP POLICY IF EXISTS service_role_reports ON internal_reports;
CREATE POLICY service_role_reports ON internal_reports
  FOR ALL USING (auth.role() = 'service_role');

-- Tenants can read reports shared with their org
DROP POLICY IF EXISTS tenant_read_reports ON internal_reports;
CREATE POLICY tenant_read_reports ON internal_reports
  FOR SELECT USING (
    org_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ) AND status IN ('ready', 'published')
  );

-- Public access via share token
DROP POLICY IF EXISTS public_share_reports ON internal_reports;
CREATE POLICY public_share_reports ON internal_reports
  FOR SELECT USING (
    share_token IS NOT NULL
    AND (share_expires IS NULL OR share_expires > now())
    AND status IN ('ready', 'published')
  );

-- ── Indexes ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_advisories_org ON client_advisories(org_id);
CREATE INDEX IF NOT EXISTS idx_advisories_dimension ON client_advisories(dimension);
CREATE INDEX IF NOT EXISTS idx_advisories_active ON client_advisories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_advisory_reads_user ON client_advisory_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_aie_type ON assessment_intelligence_events(event_type);
CREATE INDEX IF NOT EXISTS idx_aie_county ON assessment_intelligence_events(county);
CREATE INDEX IF NOT EXISTS idx_sv_county ON scoretable_views(county_slug);
CREATE INDEX IF NOT EXISTS idx_sv_viewed ON scoretable_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_reports_type ON internal_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_org ON internal_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_reports_token ON internal_reports(share_token) WHERE share_token IS NOT NULL;

-- ── Views ────────────────────────────────────────────────

-- ScoreTable analytics summary (admin)
CREATE OR REPLACE VIEW scoretable_analytics AS
SELECT
  county_slug,
  COUNT(*) AS total_views,
  COUNT(DISTINCT session_id) AS unique_sessions,
  COUNT(*) FILTER (WHERE viewed_at > now() - interval '7 days') AS views_7d,
  COUNT(*) FILTER (WHERE viewed_at > now() - interval '30 days') AS views_30d,
  MAX(viewed_at) AS last_viewed
FROM scoretable_views
GROUP BY county_slug
ORDER BY total_views DESC;
