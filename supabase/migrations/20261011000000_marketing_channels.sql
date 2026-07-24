-- ============================================================
-- MARKETING CHANNELS — Add slug/label/prp_band + Actuals table
-- ============================================================
-- marketing_channels already exists in prod with columns:
--   id, name, category, status, cadence, tool, target, notes,
--   planned_budget_cents, period_demos, period_spend_cents,
--   sort_order, is_active, created_at, updated_at
--
-- This migration adds the columns the Channels tab needs,
-- backfills existing rows, then seeds the 16-channel taxonomy.
-- ============================================================

-- ── 1. Add missing columns to existing table ─────────────────
ALTER TABLE marketing_channels ADD COLUMN IF NOT EXISTS slug     TEXT;
ALTER TABLE marketing_channels ADD COLUMN IF NOT EXISTS label    TEXT;
ALTER TABLE marketing_channels ADD COLUMN IF NOT EXISTS prp_band TEXT;

-- ── 2. Backfill existing rows ────────────────────────────────
UPDATE marketing_channels
SET slug  = lower(replace(replace(name, ' ', '_'), '/', '_')),
    label = name
WHERE slug IS NULL;

UPDATE marketing_channels
SET prp_band = 'PREDICT'
WHERE prp_band IS NULL;

-- ── 3. Add constraints now that all rows have values ─────────
DO $$ BEGIN
  ALTER TABLE marketing_channels ALTER COLUMN slug SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE marketing_channels ALTER COLUMN label SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE marketing_channels ALTER COLUMN prp_band SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE marketing_channels
    ADD CONSTRAINT marketing_channels_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE marketing_channels
    ADD CONSTRAINT marketing_channels_prp_band_check
    CHECK (prp_band IN ('PREDICT','REDUCE','PROVE'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. Per-month actuals (editable from Channels tab) ────────
CREATE TABLE IF NOT EXISTS marketing_channel_actuals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id   UUID NOT NULL REFERENCES marketing_channels(id),
  period_month DATE NOT NULL,
  demos        INT  DEFAULT 0,
  spend_cents  INT  DEFAULT 0,
  notes        TEXT,
  updated_by   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (channel_id, period_month)
);

-- ── 5. RLS ───────────────────────────────────────────────────
ALTER TABLE marketing_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only" ON marketing_channels;
CREATE POLICY "admin_only" ON marketing_channels FOR ALL
  USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

DROP POLICY IF EXISTS "service_role_all" ON marketing_channels;
CREATE POLICY "service_role_all" ON marketing_channels FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE marketing_channel_actuals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only" ON marketing_channel_actuals;
CREATE POLICY "admin_only" ON marketing_channel_actuals FOR ALL
  USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

DROP POLICY IF EXISTS "service_role_all" ON marketing_channel_actuals;
CREATE POLICY "service_role_all" ON marketing_channel_actuals FOR ALL
  USING (auth.role() = 'service_role');

-- ── 6. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mch_category ON marketing_channels(category);
CREATE INDEX IF NOT EXISTS idx_mca_channel_month ON marketing_channel_actuals(channel_id, period_month);

-- ── 7. Seed 16 channels ─────────────────────────────────────
-- Include name (legacy NOT NULL column) = label for new rows.
INSERT INTO marketing_channels (slug, name, label, category, prp_band, sort_order) VALUES
  ('seo_organic',      'SEO / Organic',        'SEO / Organic',        'Inbound / SEO',      'PREDICT', 1),
  ('content_blog',     'Content / Blog',       'Content / Blog',       'Inbound / SEO',      'PREDICT', 2),
  ('email_drip',       'Email Drip',           'Email Drip',           'Owned / Nurture',    'REDUCE',  3),
  ('newsletter',       'Newsletter',           'Newsletter',           'Owned / Nurture',    'REDUCE',  4),
  ('webinar',          'Webinars',             'Webinars',             'Owned / Nurture',    'PROVE',   5),
  ('linkedin_organic', 'LinkedIn Organic',     'LinkedIn Organic',     'Social',             'PREDICT', 6),
  ('linkedin_ads',     'LinkedIn Ads',         'LinkedIn Ads',         'Paid',               'PREDICT', 7),
  ('google_ads',       'Google Ads',           'Google Ads',           'Paid',               'PREDICT', 8),
  ('meta_ads',         'Meta / Facebook',      'Meta / Facebook',      'Paid',               'PREDICT', 9),
  ('cold_call',        'Cold Calling',         'Cold Calling',         'Outbound',           'REDUCE',  10),
  ('cold_email',       'Cold Email',           'Cold Email',           'Outbound',           'REDUCE',  11),
  ('field_visits',     'Field / Door-to-Door', 'Field / Door-to-Door', 'Outbound',           'PROVE',   12),
  ('broker_referral',  'Broker Referral',      'Broker Referral',      'Partner / Referral', 'PROVE',   13),
  ('vendor_referral',  'Vendor Referral',      'Vendor Referral',      'Partner / Referral', 'PROVE',   14),
  ('press_earned',     'Press / Earned',       'Press / Earned',       'PR / Earned',        'PREDICT', 15),
  ('events',           'Events / Tradeshows',  'Events / Tradeshows',  'PR / Earned',        'PROVE',   16)
ON CONFLICT (slug) DO NOTHING;
