-- ============================================================
-- API & Integration Hub — Database Tables
-- Adds: API applications, tokens, request logs, webhooks,
--        sandbox keys, integrations, sync logs, entity maps,
--        marketplace listings
-- ============================================================

-- ── API Applications (OAuth clients) ──────────────────────────

CREATE TABLE IF NOT EXISTS api_applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  client_id       text NOT NULL UNIQUE DEFAULT 'evd_' || encode(gen_random_bytes(16), 'hex'),
  client_secret   text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  redirect_uris   text[] NOT NULL DEFAULT '{}',
  scopes          text[] NOT NULL DEFAULT '{read:locations,read:compliance}',
  grant_types     text[] NOT NULL DEFAULT '{client_credentials}',
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
  rate_limit_tier text NOT NULL DEFAULT 'starter' CHECK (rate_limit_tier IN ('starter','professional','enterprise')),
  created_by      uuid REFERENCES user_profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── API Tokens ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES api_applications(id) ON DELETE CASCADE,
  token_hash      text NOT NULL UNIQUE,
  token_type      text NOT NULL DEFAULT 'bearer' CHECK (token_type IN ('bearer','refresh')),
  scopes          text[] NOT NULL DEFAULT '{}',
  expires_at      timestamptz NOT NULL,
  last_used_at    timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_tokens_app ON api_tokens (application_id, created_at DESC);
CREATE INDEX idx_api_tokens_hash ON api_tokens (token_hash) WHERE revoked_at IS NULL;

-- ── API Request Log ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_request_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid REFERENCES api_applications(id) ON DELETE SET NULL,
  method          text NOT NULL,
  path            text NOT NULL,
  status_code     int NOT NULL,
  response_ms     int NOT NULL,
  ip_address      inet,
  user_agent      text,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_request_log_app ON api_request_log (application_id, created_at DESC);
CREATE INDEX idx_api_request_log_time ON api_request_log (created_at DESC);

-- ── API Webhook Subscriptions ─────────────────────────────────

CREATE TABLE IF NOT EXISTS api_webhook_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES api_applications(id) ON DELETE CASCADE,
  url             text NOT NULL,
  events          text[] NOT NULL,
  secret_hash     text NOT NULL,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','disabled')),
  failure_count   int NOT NULL DEFAULT 0,
  last_delivery_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── API Webhook Deliveries ────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_webhook_deliveries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES api_webhook_subscriptions(id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  payload         jsonb NOT NULL,
  response_code   int,
  response_body   text,
  duration_ms     int,
  success         boolean NOT NULL DEFAULT false,
  attempt_number  int NOT NULL DEFAULT 1,
  next_retry_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_sub ON api_webhook_deliveries (subscription_id, created_at DESC);

-- ── API Sandbox Keys ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_sandbox_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES api_applications(id) ON DELETE CASCADE,
  sandbox_key     text NOT NULL UNIQUE DEFAULT 'evd_sandbox_sk_' || encode(gen_random_bytes(24), 'hex'),
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '90 days',
  last_used_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Integrations (outbound connections) ───────────────────────

CREATE TABLE IF NOT EXISTS integrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform_slug   text NOT NULL,
  platform_name   text NOT NULL,
  status          text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','disconnected','error','syncing','paused')),
  auth_data       jsonb NOT NULL DEFAULT '{}',
  config          jsonb NOT NULL DEFAULT '{}',
  connected_at    timestamptz NOT NULL DEFAULT now(),
  last_sync_at    timestamptz,
  last_sync_status text CHECK (last_sync_status IN ('success','partial','failed')),
  next_sync_at    timestamptz,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_integrations_org ON integrations (organization_id, platform_slug);

-- ── Integration Sync Log ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_sync_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id  uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  sync_type       text NOT NULL CHECK (sync_type IN ('pull','push','webhook')),
  entity_type     text NOT NULL,
  direction       text NOT NULL CHECK (direction IN ('inbound','outbound')),
  records_processed int NOT NULL DEFAULT 0,
  records_created int NOT NULL DEFAULT 0,
  records_updated int NOT NULL DEFAULT 0,
  records_failed  int NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','partial','failed','running')),
  error_message   text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  duration_ms     int
);

CREATE INDEX idx_sync_log_integration ON integration_sync_log (integration_id, started_at DESC);

-- ── Integration Entity Map (ID mapping between systems) ───────

CREATE TABLE IF NOT EXISTS integration_entity_map (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id  uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  entity_type     text NOT NULL,
  evidly_id       uuid NOT NULL,
  external_id     text NOT NULL,
  external_data   jsonb DEFAULT '{}',
  last_synced_at  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_id, entity_type, evidly_id)
);

-- ── Integration Webhook Config ────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_webhook_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id  uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  endpoint_path   text NOT NULL UNIQUE,
  hmac_secret     text NOT NULL,
  event_mapping   jsonb NOT NULL DEFAULT '{}',
  active          boolean NOT NULL DEFAULT true,
  last_received_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── API Marketplace Listings ──────────────────────────────────

CREATE TABLE IF NOT EXISTS api_marketplace_listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES api_applications(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  description     text NOT NULL,
  category        text NOT NULL,
  icon_url        text,
  screenshots     text[] DEFAULT '{}',
  pricing_model   text NOT NULL DEFAULT 'free' CHECK (pricing_model IN ('free','freemium','paid','enterprise')),
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','suspended')),
  install_count   int NOT NULL DEFAULT 0,
  rating          numeric(2,1) DEFAULT 0,
  review_count    int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  published_at    timestamptz
);

-- ── Row-Level Security ────────────────────────────────────────

ALTER TABLE api_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_sandbox_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_entity_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhook_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_marketplace_listings ENABLE ROW LEVEL SECURITY;

-- RLS policies: organization-scoped access
CREATE POLICY "api_apps_org" ON api_applications FOR ALL USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "api_tokens_org" ON api_tokens FOR ALL USING (application_id IN (SELECT id FROM api_applications WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "api_request_log_org" ON api_request_log FOR ALL USING (application_id IN (SELECT id FROM api_applications WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "api_webhook_subs_org" ON api_webhook_subscriptions FOR ALL USING (application_id IN (SELECT id FROM api_applications WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "api_webhook_del_org" ON api_webhook_deliveries FOR ALL USING (subscription_id IN (SELECT id FROM api_webhook_subscriptions WHERE application_id IN (SELECT id FROM api_applications WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))));
CREATE POLICY "api_sandbox_org" ON api_sandbox_keys FOR ALL USING (application_id IN (SELECT id FROM api_applications WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "integrations_org" ON integrations FOR ALL USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "sync_log_org" ON integration_sync_log FOR ALL USING (integration_id IN (SELECT id FROM integrations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "entity_map_org" ON integration_entity_map FOR ALL USING (integration_id IN (SELECT id FROM integrations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "webhook_config_org" ON integration_webhook_config FOR ALL USING (integration_id IN (SELECT id FROM integrations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
CREATE POLICY "marketplace_public" ON api_marketplace_listings FOR SELECT USING (status = 'published');
CREATE POLICY "marketplace_owner" ON api_marketplace_listings FOR ALL USING (application_id IN (SELECT id FROM api_applications WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
