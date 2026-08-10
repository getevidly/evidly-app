-- ============================================================
-- CAMPAIGN FORECAST — typed forecast vs real actuals
-- ============================================================
-- The only genuinely-typed forecast surface in the marketing
-- console.  Actuals come from marketing_channel_actuals (same
-- source as Channels); variance is computed in the UI.
--
-- Unique on (period, channel) so editing a month+channel row
-- upserts rather than duplicating.
-- ============================================================

CREATE TABLE IF NOT EXISTS campaign_forecast (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period               DATE NOT NULL,                      -- first-of-month
  channel              TEXT NOT NULL,                       -- channel label
  forecast_demos       INT  NOT NULL DEFAULT 0,
  forecast_spend_cents INT  NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE (period, channel)
);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE campaign_forecast ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON campaign_forecast
  FOR ALL TO authenticated
  USING  ((auth.jwt() ->> 'email') LIKE '%@getevidly.com')
  WITH CHECK ((auth.jwt() ->> 'email') LIKE '%@getevidly.com');

CREATE POLICY "Service role bypass" ON campaign_forecast
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── Index ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cf_period_channel
  ON campaign_forecast (period, channel);
