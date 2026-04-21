-- ============================================================
-- GUIDED TOURS + MARKETING & SALES PIPELINE — Schema & Seed
-- ============================================================

-- ── 1. Guided tour templates ────────────────────────────────
CREATE TABLE IF NOT EXISTS guided_tour_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  target_segment TEXT NOT NULL CHECK (target_segment IN (
    'restaurant_single','restaurant_multi','hospitality','healthcare',
    'institutional','enterprise','default'
  )),
  county TEXT,
  industry TEXT,
  modules_enabled TEXT[] DEFAULT '{}',
  demo_locations JSONB DEFAULT '[]',
  talking_points JSONB DEFAULT '[]',
  duration_minutes INT DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Extend demo_sessions ────────────────────────────────
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES guided_tour_templates(id);
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS prospect_name TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS prospect_title TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS location_count INT DEFAULT 1;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS segment TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS sales_stage TEXT DEFAULT 'tour_scheduled';
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS outcome_notes TEXT;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS lost_reason TEXT;

-- ── 3. Tour engagement events ──────────────────────────────
CREATE TABLE IF NOT EXISTS tour_engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES demo_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  page_or_feature TEXT,
  duration_seconds INT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 4. Marketing campaigns ─────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN (
    'email','linkedin','cold_call','event','referral',
    'seo','paid_ads','partner','direct','other'
  )),
  target_segment TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  start_date DATE,
  end_date DATE,
  budget_cents INT DEFAULT 0,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 5. Marketing touchpoints ───────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES marketing_campaigns(id),
  lead_id UUID,
  session_id UUID REFERENCES demo_sessions(id),
  touchpoint_type TEXT NOT NULL,
  channel TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 6. Sales pipeline ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES demo_sessions(id),
  lead_id UUID,
  org_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_title TEXT,
  segment TEXT,
  industry TEXT,
  location_count INT DEFAULT 1,
  estimated_mrr_cents INT DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'prospect' CHECK (stage IN (
    'prospect','tour_scheduled','tour_completed',
    'proposal_sent','negotiating','won','lost','churned'
  )),
  probability_pct INT DEFAULT 10,
  expected_close_date DATE,
  won_date DATE,
  lost_date DATE,
  lost_reason TEXT,
  notes TEXT,
  assigned_to TEXT DEFAULT 'arthur@getevidly.com',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE guided_tour_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_touchpoints  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_pipeline         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only" ON guided_tour_templates;
CREATE POLICY "admin_only" ON guided_tour_templates  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');
DROP POLICY IF EXISTS "admin_only" ON tour_engagement_events;
CREATE POLICY "admin_only" ON tour_engagement_events FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');
DROP POLICY IF EXISTS "admin_only" ON marketing_campaigns;
CREATE POLICY "admin_only" ON marketing_campaigns    FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');
DROP POLICY IF EXISTS "admin_only" ON marketing_touchpoints;
CREATE POLICY "admin_only" ON marketing_touchpoints  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');
DROP POLICY IF EXISTS "admin_only" ON sales_pipeline;
CREATE POLICY "admin_only" ON sales_pipeline         FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

DROP POLICY IF EXISTS "service_role_all" ON guided_tour_templates;
CREATE POLICY "service_role_all" ON guided_tour_templates  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "service_role_all" ON tour_engagement_events;
CREATE POLICY "service_role_all" ON tour_engagement_events FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "service_role_all" ON marketing_campaigns;
CREATE POLICY "service_role_all" ON marketing_campaigns    FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "service_role_all" ON marketing_touchpoints;
CREATE POLICY "service_role_all" ON marketing_touchpoints  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "service_role_all" ON sales_pipeline;
CREATE POLICY "service_role_all" ON sales_pipeline         FOR ALL USING (auth.role() = 'service_role');

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tour_templates_segment ON guided_tour_templates(target_segment);
CREATE INDEX IF NOT EXISTS idx_tour_engagement_session ON tour_engagement_events(session_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_touchpoints_campaign ON marketing_touchpoints(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_stage ON sales_pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_mrr ON sales_pipeline(estimated_mrr_cents DESC);

-- ── Seed default tour templates ────────────────────────────
INSERT INTO guided_tour_templates (name, description, target_segment, industry, modules_enabled, duration_minutes, created_by) VALUES
  ('Default Restaurant Tour',     'Single-location restaurant owner — 20 min overview',        'restaurant_single', 'restaurant',    ARRAY['temp','checklists','corrective_actions','documents','facility_safety'], 20, 'arthur@getevidly.com'),
  ('Multi-Unit Restaurant Tour',  'Multi-location operator — focus on portfolio visibility',    'restaurant_multi',  'restaurant',    ARRAY['temp','checklists','corrective_actions','benchmarks','leaderboard','business_intelligence'], 30, 'arthur@getevidly.com'),
  ('Healthcare / Institutional',  'Hospital or institutional kitchen — regulatory focus',       'institutional',     'healthcare',    ARRAY['temp','checklists','haccp','corrective_actions','documents','regulatory_updates'], 25, 'arthur@getevidly.com'),
  ('Hospitality Tour',            'Hotel F&B or resort — multi-outlet focus',                  'hospitality',       'hospitality',   ARRAY['temp','checklists','facility_safety','equipment','vendors','benchmarks'], 25, 'arthur@getevidly.com'),
  ('Enterprise / Contract Dining','Enterprise contract dining — 7+ locations, exec focus',     'enterprise',        'institutional', ARRAY['business_intelligence','benchmarks','leaderboard','corrective_actions','risk_analysis','analytics'], 40, 'arthur@getevidly.com')
ON CONFLICT DO NOTHING;
