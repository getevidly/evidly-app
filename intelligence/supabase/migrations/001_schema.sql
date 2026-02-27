-- ============================================================
-- INTEL-01 Migration 001 — Complete Schema
-- EvidLY Intelligence (Standalone Supabase Project)
-- 17 tables + indexes + RLS
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- trigram fuzzy search

-- ============================================================
-- 1. intelligence_clients
-- Client organizations subscribed to intelligence feeds.
-- References live-app org IDs as TEXT (never FK).
-- ============================================================
CREATE TABLE intelligence_clients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_org_id    TEXT NOT NULL UNIQUE,          -- live-app organization ID (text, not FK)
  name          TEXT NOT NULL,
  plan_tier     TEXT NOT NULL DEFAULT 'founder' CHECK (plan_tier IN ('trial','founder','professional','enterprise')),
  jurisdictions TEXT[] NOT NULL DEFAULT '{}',  -- array of jurisdiction codes
  active        BOOLEAN NOT NULL DEFAULT true,
  webhook_url   TEXT,                          -- per-client webhook override
  webhook_secret TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. intelligence_sources
-- External data sources (FDA, CDC, health depts, etc.)
-- ============================================================
CREATE TABLE intelligence_sources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT NOT NULL UNIQUE,          -- e.g. 'fda-recalls', 'fresno-county-health'
  name            TEXT NOT NULL,
  source_type     TEXT NOT NULL CHECK (source_type IN (
    'health_dept','legislative','fda_recall','outbreak',
    'regulatory','osha','news','industry_report','weather','fire_code'
  )),
  base_url        TEXT,                          -- API or scrape URL
  api_key_env     TEXT,                          -- env var name for API key
  crawl_method    TEXT NOT NULL DEFAULT 'api' CHECK (crawl_method IN ('api','rss','scrape','webhook_receive')),
  crawl_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (crawl_frequency IN ('hourly','daily','weekly','monthly','realtime')),
  jurisdiction    TEXT,                          -- jurisdiction code (null = national)
  state_code      TEXT,                          -- US state (e.g. 'CA')
  active          BOOLEAN NOT NULL DEFAULT true,
  last_crawl_at   TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  error_count     INT NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. intelligence_events
-- Raw events crawled from external sources.
-- ============================================================
CREATE TABLE intelligence_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id       UUID NOT NULL REFERENCES intelligence_sources(id) ON DELETE CASCADE,
  external_id     TEXT,                          -- ID from the external source
  event_type      TEXT NOT NULL,                 -- e.g. 'recall', 'violation', 'outbreak', 'legislation'
  title           TEXT NOT NULL,
  summary         TEXT,
  raw_data        JSONB NOT NULL DEFAULT '{}',
  url             TEXT,                          -- original source URL
  published_at    TIMESTAMPTZ,
  crawled_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  jurisdiction    TEXT,
  state_code      TEXT,
  severity        TEXT CHECK (severity IN ('critical','high','medium','low','info')),
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','analyzed','matched','delivered','archived','duplicate')),
  dedup_hash      TEXT,                          -- SHA-256 for deduplication
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. intelligence_insights
-- Analyzed, scored insights derived from events.
-- ============================================================
CREATE TABLE intelligence_insights (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID REFERENCES intelligence_events(id) ON DELETE SET NULL,
  source_id       UUID NOT NULL REFERENCES intelligence_sources(id) ON DELETE CASCADE,
  insight_type    TEXT NOT NULL,                  -- e.g. 'risk_alert', 'opportunity', 'trend', 'regulatory_change'
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  relevance_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 100),
  confidence      NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  impact_level    TEXT CHECK (impact_level IN ('critical','high','medium','low')),
  affected_pillars TEXT[] NOT NULL DEFAULT '{}',  -- e.g. '{food_safety,facility_safety}'
  jurisdictions   TEXT[] NOT NULL DEFAULT '{}',
  recommended_actions JSONB NOT NULL DEFAULT '[]',
  expires_at      TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','delivered','expired','dismissed')),
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. recall_alerts
-- FDA / USDA food recall alerts.
-- ============================================================
CREATE TABLE recall_alerts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id          UUID REFERENCES intelligence_events(id) ON DELETE SET NULL,
  recall_number     TEXT UNIQUE,                   -- FDA recall number
  recalling_firm    TEXT NOT NULL,
  product_desc      TEXT NOT NULL,
  reason            TEXT NOT NULL,
  classification    TEXT NOT NULL CHECK (classification IN ('Class I','Class II','Class III')),
  status            TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing','terminated','completed')),
  distribution      TEXT,                          -- geographic distribution
  quantity          TEXT,
  initiated_date    DATE,
  report_date       DATE,
  source_agency     TEXT NOT NULL DEFAULT 'FDA' CHECK (source_agency IN ('FDA','USDA','STATE')),
  affected_states   TEXT[] NOT NULL DEFAULT '{}',
  product_codes     TEXT[] NOT NULL DEFAULT '{}',  -- UPC / product codes
  severity          TEXT CHECK (severity IN ('critical','high','medium','low')),
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. outbreak_alerts
-- CDC / CDPH outbreak notifications.
-- ============================================================
CREATE TABLE outbreak_alerts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id          UUID REFERENCES intelligence_events(id) ON DELETE SET NULL,
  outbreak_id       TEXT UNIQUE,                   -- CDC outbreak ID
  pathogen          TEXT NOT NULL,                  -- e.g. 'Salmonella', 'E. coli O157:H7'
  pathogen_category TEXT CHECK (pathogen_category IN ('bacteria','virus','parasite','toxin','unknown')),
  vehicle           TEXT,                          -- food vehicle (e.g. 'romaine lettuce')
  case_count        INT NOT NULL DEFAULT 0,
  hospitalized      INT NOT NULL DEFAULT 0,
  deaths            INT NOT NULL DEFAULT 0,
  affected_states   TEXT[] NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','monitoring')),
  cdc_investigation BOOLEAN NOT NULL DEFAULT false,
  source_url        TEXT,
  first_illness     DATE,
  last_illness      DATE,
  severity          TEXT CHECK (severity IN ('critical','high','medium','low')),
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. inspector_patterns
-- Health department inspector behavior patterns.
-- ============================================================
CREATE TABLE inspector_patterns (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id         UUID REFERENCES intelligence_sources(id) ON DELETE SET NULL,
  jurisdiction      TEXT NOT NULL,
  inspector_name    TEXT,                          -- may be anonymized
  inspector_id      TEXT,                          -- dept-assigned ID
  pattern_type      TEXT NOT NULL CHECK (pattern_type IN (
    'focus_area','seasonal','frequency','severity_trend','new_emphasis'
  )),
  description       TEXT NOT NULL,
  focus_areas       TEXT[] NOT NULL DEFAULT '{}',  -- e.g. '{temperature_control,handwashing}'
  avg_violations    NUMERIC(5,2),
  avg_severity      NUMERIC(3,2),
  inspection_count  INT NOT NULL DEFAULT 0,
  date_range_start  DATE,
  date_range_end    DATE,
  confidence        NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. legislative_items
-- Pending / enacted food safety legislation.
-- ============================================================
CREATE TABLE legislative_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id          UUID REFERENCES intelligence_events(id) ON DELETE SET NULL,
  bill_number       TEXT NOT NULL,                 -- e.g. 'AB-1234', 'SB-567'
  title             TEXT NOT NULL,
  summary           TEXT NOT NULL,
  body_name         TEXT NOT NULL,                 -- e.g. 'California State Legislature'
  jurisdiction      TEXT NOT NULL,
  state_code        TEXT,
  status            TEXT NOT NULL CHECK (status IN (
    'introduced','in_committee','passed_committee','passed_chamber',
    'passed_both','enrolled','signed','vetoed','chaptered','dead'
  )),
  impact_areas      TEXT[] NOT NULL DEFAULT '{}',  -- e.g. '{food_safety,labeling,allergens}'
  effective_date    DATE,
  last_action       TEXT,
  last_action_date  DATE,
  sponsor           TEXT,
  compliance_impact TEXT CHECK (compliance_impact IN ('high','medium','low','none')),
  source_url        TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. weather_risk_events
-- Weather events affecting food safety operations.
-- ============================================================
CREATE TABLE weather_risk_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id          UUID REFERENCES intelligence_events(id) ON DELETE SET NULL,
  weather_type      TEXT NOT NULL CHECK (weather_type IN (
    'heat_wave','power_outage','flood','wildfire','storm','freeze','air_quality'
  )),
  severity          TEXT NOT NULL CHECK (severity IN ('extreme','severe','moderate','minor')),
  affected_area     TEXT NOT NULL,                 -- geographic description
  affected_coords   JSONB,                         -- {lat, lng, radius_miles}
  affected_states   TEXT[] NOT NULL DEFAULT '{}',
  affected_counties TEXT[] NOT NULL DEFAULT '{}',
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ,
  food_safety_impact TEXT NOT NULL,                -- description of food safety risks
  recommended_actions JSONB NOT NULL DEFAULT '[]',
  nws_alert_id      TEXT,                          -- NWS alert identifier
  source_url        TEXT,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','monitoring','resolved')),
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. competitor_events
-- Competitor compliance events from public records.
-- ============================================================
CREATE TABLE competitor_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id          UUID REFERENCES intelligence_events(id) ON DELETE SET NULL,
  business_name     TEXT NOT NULL,
  business_type     TEXT,                          -- e.g. 'restaurant', 'food_truck'
  event_type        TEXT NOT NULL CHECK (event_type IN (
    'violation','closure','downgrade','upgrade','award','recall','complaint'
  )),
  jurisdiction      TEXT NOT NULL,
  description       TEXT NOT NULL,
  severity          TEXT CHECK (severity IN ('critical','high','medium','low')),
  source_url        TEXT,
  event_date        DATE,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. market_intelligence
-- Industry trends and market data.
-- ============================================================
CREATE TABLE market_intelligence (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id          UUID REFERENCES intelligence_events(id) ON DELETE SET NULL,
  category          TEXT NOT NULL CHECK (category IN (
    'industry_trend','technology','best_practice','benchmark',
    'labor_market','supply_chain','consumer_sentiment'
  )),
  title             TEXT NOT NULL,
  summary           TEXT NOT NULL,
  source_name       TEXT NOT NULL,
  source_url        TEXT,
  relevance_score   NUMERIC(5,2) NOT NULL DEFAULT 50,
  published_at      TIMESTAMPTZ,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 12. executive_snapshots
-- Point-in-time executive briefing snapshots.
-- ============================================================
CREATE TABLE executive_snapshots (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         UUID NOT NULL REFERENCES intelligence_clients(id) ON DELETE CASCADE,
  snapshot_date     DATE NOT NULL,
  period            TEXT NOT NULL DEFAULT 'weekly' CHECK (period IN ('daily','weekly','monthly','quarterly')),
  summary           TEXT NOT NULL,
  key_risks         JSONB NOT NULL DEFAULT '[]',   -- [{title, severity, description}]
  key_opportunities JSONB NOT NULL DEFAULT '[]',   -- [{title, impact, description}]
  regulatory_changes JSONB NOT NULL DEFAULT '[]',  -- [{bill, status, impact}]
  recall_summary    JSONB NOT NULL DEFAULT '{}',   -- {active_count, new_this_period, critical_count}
  outbreak_summary  JSONB NOT NULL DEFAULT '{}',   -- {active_count, nearby, pathogen_list}
  weather_risks     JSONB NOT NULL DEFAULT '[]',
  action_items      JSONB NOT NULL DEFAULT '[]',   -- [{priority, action, deadline}]
  ai_confidence     NUMERIC(3,2) NOT NULL DEFAULT 0.7,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. intelligence_correlations
-- Cross-source event correlations.
-- ============================================================
CREATE TABLE intelligence_correlations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_ids         UUID[] NOT NULL,               -- array of correlated event IDs
  insight_id        UUID REFERENCES intelligence_insights(id) ON DELETE SET NULL,
  correlation_type  TEXT NOT NULL CHECK (correlation_type IN (
    'outbreak_recall','weather_violation','seasonal_pattern',
    'inspector_trend','legislative_impact','multi_source'
  )),
  description       TEXT NOT NULL,
  strength          NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  evidence          JSONB NOT NULL DEFAULT '[]',   -- supporting data points
  status            TEXT NOT NULL DEFAULT 'detected' CHECK (status IN ('detected','confirmed','dismissed','expired')),
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 14. client_subscriptions
-- Per-client source/jurisdiction subscriptions.
-- ============================================================
CREATE TABLE client_subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         UUID NOT NULL REFERENCES intelligence_clients(id) ON DELETE CASCADE,
  source_id         UUID REFERENCES intelligence_sources(id) ON DELETE CASCADE,
  source_type       TEXT,                          -- subscribe by type (alternative to source_id)
  jurisdictions     TEXT[] NOT NULL DEFAULT '{}',  -- filter by jurisdiction codes
  severity_filter   TEXT[] NOT NULL DEFAULT '{critical,high,medium}',
  active            BOOLEAN NOT NULL DEFAULT true,
  delivery_method   TEXT NOT NULL DEFAULT 'webhook' CHECK (delivery_method IN ('webhook','digest','both')),
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, source_id)
);

-- ============================================================
-- 15. insight_deliveries
-- Delivery log for webhook POST attempts.
-- ============================================================
CREATE TABLE insight_deliveries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  insight_id        UUID NOT NULL REFERENCES intelligence_insights(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES intelligence_clients(id) ON DELETE CASCADE,
  delivery_method   TEXT NOT NULL CHECK (delivery_method IN ('webhook','digest','email')),
  webhook_url       TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','retrying')),
  http_status       INT,
  response_body     TEXT,
  attempt_count     INT NOT NULL DEFAULT 0,
  last_attempt_at   TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  error_message     TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 16. intelligence_digests
-- Weekly compiled digests per client.
-- ============================================================
CREATE TABLE intelligence_digests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         UUID NOT NULL REFERENCES intelligence_clients(id) ON DELETE CASCADE,
  digest_type       TEXT NOT NULL DEFAULT 'weekly' CHECK (digest_type IN ('daily','weekly','monthly')),
  period_start      TIMESTAMPTZ NOT NULL,
  period_end        TIMESTAMPTZ NOT NULL,
  insight_count     INT NOT NULL DEFAULT 0,
  insight_ids       UUID[] NOT NULL DEFAULT '{}',
  summary           TEXT NOT NULL,
  sections          JSONB NOT NULL DEFAULT '{}',   -- {recalls: {...}, outbreaks: {...}, legislative: {...}, ...}
  html_content      TEXT,                          -- rendered HTML for email
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','compiled','sent','failed')),
  sent_at           TIMESTAMPTZ,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 17. source_health_log
-- Source availability and health monitoring.
-- ============================================================
CREATE TABLE source_health_log (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id         UUID NOT NULL REFERENCES intelligence_sources(id) ON DELETE CASCADE,
  check_time        TIMESTAMPTZ NOT NULL DEFAULT now(),
  status            TEXT NOT NULL CHECK (status IN ('healthy','degraded','down','error','timeout')),
  response_time_ms  INT,
  http_status       INT,
  error_message     TEXT,
  events_found      INT NOT NULL DEFAULT 0,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- INDEXES
-- ============================================================

-- intelligence_events
CREATE INDEX idx_events_source_id        ON intelligence_events(source_id);
CREATE INDEX idx_events_status           ON intelligence_events(status);
CREATE INDEX idx_events_event_type       ON intelligence_events(event_type);
CREATE INDEX idx_events_jurisdiction     ON intelligence_events(jurisdiction);
CREATE INDEX idx_events_crawled_at       ON intelligence_events(crawled_at DESC);
CREATE INDEX idx_events_dedup_hash       ON intelligence_events(dedup_hash);
CREATE INDEX idx_events_severity         ON intelligence_events(severity);

-- intelligence_insights
CREATE INDEX idx_insights_source_id      ON intelligence_insights(source_id);
CREATE INDEX idx_insights_event_id       ON intelligence_insights(event_id);
CREATE INDEX idx_insights_status         ON intelligence_insights(status);
CREATE INDEX idx_insights_relevance      ON intelligence_insights(relevance_score DESC);
CREATE INDEX idx_insights_created_at     ON intelligence_insights(created_at DESC);
CREATE INDEX idx_insights_jurisdictions  ON intelligence_insights USING GIN (jurisdictions);

-- recall_alerts
CREATE INDEX idx_recalls_classification  ON recall_alerts(classification);
CREATE INDEX idx_recalls_status          ON recall_alerts(status);
CREATE INDEX idx_recalls_source_agency   ON recall_alerts(source_agency);
CREATE INDEX idx_recalls_initiated_date  ON recall_alerts(initiated_date DESC);
CREATE INDEX idx_recalls_affected_states ON recall_alerts USING GIN (affected_states);

-- outbreak_alerts
CREATE INDEX idx_outbreaks_pathogen      ON outbreak_alerts(pathogen);
CREATE INDEX idx_outbreaks_status        ON outbreak_alerts(status);
CREATE INDEX idx_outbreaks_affected      ON outbreak_alerts USING GIN (affected_states);
CREATE INDEX idx_outbreaks_created       ON outbreak_alerts(created_at DESC);

-- inspector_patterns
CREATE INDEX idx_inspectors_jurisdiction ON inspector_patterns(jurisdiction);
CREATE INDEX idx_inspectors_pattern_type ON inspector_patterns(pattern_type);
CREATE INDEX idx_inspectors_focus_areas  ON inspector_patterns USING GIN (focus_areas);

-- legislative_items
CREATE INDEX idx_legislative_status      ON legislative_items(status);
CREATE INDEX idx_legislative_jurisdiction ON legislative_items(jurisdiction);
CREATE INDEX idx_legislative_state       ON legislative_items(state_code);
CREATE INDEX idx_legislative_impact      ON legislative_items USING GIN (impact_areas);

-- weather_risk_events
CREATE INDEX idx_weather_type            ON weather_risk_events(weather_type);
CREATE INDEX idx_weather_severity        ON weather_risk_events(severity);
CREATE INDEX idx_weather_status          ON weather_risk_events(status);
CREATE INDEX idx_weather_states          ON weather_risk_events USING GIN (affected_states);

-- competitor_events
CREATE INDEX idx_competitor_jurisdiction ON competitor_events(jurisdiction);
CREATE INDEX idx_competitor_event_type   ON competitor_events(event_type);
CREATE INDEX idx_competitor_date         ON competitor_events(event_date DESC);

-- market_intelligence
CREATE INDEX idx_market_category         ON market_intelligence(category);
CREATE INDEX idx_market_tags             ON market_intelligence USING GIN (tags);

-- executive_snapshots
CREATE INDEX idx_snapshots_client        ON executive_snapshots(client_id);
CREATE INDEX idx_snapshots_date          ON executive_snapshots(snapshot_date DESC);

-- intelligence_correlations
CREATE INDEX idx_correlations_type       ON intelligence_correlations(correlation_type);
CREATE INDEX idx_correlations_events     ON intelligence_correlations USING GIN (event_ids);

-- client_subscriptions
CREATE INDEX idx_subscriptions_client    ON client_subscriptions(client_id);
CREATE INDEX idx_subscriptions_source    ON client_subscriptions(source_id);

-- insight_deliveries
CREATE INDEX idx_deliveries_insight      ON insight_deliveries(insight_id);
CREATE INDEX idx_deliveries_client       ON insight_deliveries(client_id);
CREATE INDEX idx_deliveries_status       ON insight_deliveries(status);
CREATE INDEX idx_deliveries_created      ON insight_deliveries(created_at DESC);

-- intelligence_digests
CREATE INDEX idx_digests_client          ON intelligence_digests(client_id);
CREATE INDEX idx_digests_status          ON intelligence_digests(status);
CREATE INDEX idx_digests_period          ON intelligence_digests(period_start, period_end);

-- source_health_log
CREATE INDEX idx_health_source           ON source_health_log(source_id);
CREATE INDEX idx_health_check_time       ON source_health_log(check_time DESC);
CREATE INDEX idx_health_status           ON source_health_log(status);


-- ============================================================
-- ROW LEVEL SECURITY — Enable on ALL tables
-- Service-role only (no end-user auth in this project).
-- ============================================================

ALTER TABLE intelligence_clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_sources      ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_insights     ENABLE ROW LEVEL SECURITY;
ALTER TABLE recall_alerts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbreak_alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspector_patterns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE legislative_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_risk_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_intelligence       ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_deliveries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_digests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_health_log         ENABLE ROW LEVEL SECURITY;

-- Service-role bypass policies (service_role can do everything)
CREATE POLICY "service_role_all" ON intelligence_clients      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON intelligence_sources      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON intelligence_events       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON intelligence_insights     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON recall_alerts             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON outbreak_alerts           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON inspector_patterns        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON legislative_items         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON weather_risk_events       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON competitor_events         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON market_intelligence       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON executive_snapshots       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON intelligence_correlations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON client_subscriptions      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON insight_deliveries        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON intelligence_digests      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON source_health_log         FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to tables that have the column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON intelligence_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON intelligence_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON intelligence_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON recall_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON outbreak_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON inspector_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON intelligence_correlations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
