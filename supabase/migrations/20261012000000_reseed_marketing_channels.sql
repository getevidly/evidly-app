-- ============================================================
-- MARKETING CHANNELS — Reseed canonical 16 from campaign mock
-- ============================================================
-- The prior seed (20261011000000) inserted a generic 16-channel
-- taxonomy that does not match the actual campaign.  Combined
-- with the 5 pre-existing legacy rows the table held 21 rows
-- with internal duplicates and none of the real channel names.
--
-- Verified via prod SQL: marketing_channel_actuals has ZERO rows
-- referencing any existing channel — safe to deactivate all.
--
-- This migration:
--   1. Adds 6 columns the mock requires (kpi, priority, is_new,
--      flag, activation_start_month, activation_end_month).
--   2. Ensures the slug UNIQUE constraint exists.
--   3. Deactivates all 21 existing rows.
--   4. Upserts the 16 canonical channels (ON CONFLICT slug).
--      Two slugs already exist (outbound_calls legacy,
--      google_ads Phase 3) and get reactivated + updated;
--      the other 14 are fresh inserts.
--   Result: exactly 16 rows with is_active = true.
-- ============================================================

-- ── 1. New columns ──────────────────────────────────────────
ALTER TABLE marketing_channels ADD COLUMN IF NOT EXISTS kpi                    TEXT;
ALTER TABLE marketing_channels ADD COLUMN IF NOT EXISTS priority               BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE marketing_channels ADD COLUMN IF NOT EXISTS is_new                 BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE marketing_channels ADD COLUMN IF NOT EXISTS flag                   TEXT;
ALTER TABLE marketing_channels ADD COLUMN IF NOT EXISTS activation_start_month INT;
ALTER TABLE marketing_channels ADD COLUMN IF NOT EXISTS activation_end_month   INT;

-- ── 2. Ensure slug UNIQUE constraint ────────────────────────
-- 42P07 (duplicate_table) is thrown when the underlying index
-- already exists; duplicate_object only covers 42710.
DO $$ BEGIN
  ALTER TABLE marketing_channels
    ADD CONSTRAINT marketing_channels_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Deactivate ALL existing rows ─────────────────────────
UPDATE marketing_channels
SET is_active = false, updated_at = now();

-- ── 3b. Defuse name-uniqueness collisions ───────────────────
-- The table has a UNIQUE constraint on name (marketing_channels_name_key).
-- Legacy row in_person_prospecting has name='In Person Prospecting'
-- which collides with the canonical in_person row.  The ON CONFLICT
-- is on slug, so these different-slug/same-name pairs must be
-- renamed before the upsert can proceed.
UPDATE marketing_channels
SET name  = name || ' [retired]',
    label = label || ' [retired]',
    updated_at = now()
WHERE slug = 'in_person_prospecting';

-- ── 4. Upsert 16 canonical channels ─────────────────────────
INSERT INTO marketing_channels (
  slug, name, label, category, prp_band,
  cadence, tool, kpi, target, notes,
  priority, is_new, flag,
  activation_start_month, activation_end_month,
  sort_order, is_active
) VALUES
  -- Inbound / SEO (3)
  ('stovio',
   'Stovio Editorial', 'Stovio Editorial', 'Inbound / SEO', 'PREDICT',
   '2 articles / wk', 'Stovio CMS', 'Organic sessions', '12K/mo by M12',
   'The only compounding channel. Predict-layer gap is the target.',
   true, false, NULL, 0, 11, 1, true),

  ('brand_blogs',
   'Brand Blogs', 'Brand Blogs', 'Inbound / SEO', 'PREDICT',
   '1 / wk', 'Site CMS', 'Assisted demos', '8/mo',
   'Supports Stovio; brand-owned proof pages.',
   false, false, NULL, 0, 11, 2, true),

  ('gmb',
   'Google Business Profile', 'Google Business Profile', 'Inbound / SEO', 'PREDICT',
   '2 posts / wk', 'GBP', 'Profile actions', '150/mo',
   'Local discovery for CPP crossover.',
   false, false, NULL, 0, 11, 3, true),

  -- Owned / Nurture (2)
  ('hubspot_drip',
   'HubSpot Email Drip', 'HubSpot Email Drip', 'Owned / Nurture', 'REDUCE',
   '52-wk PRP sequence', 'HubSpot', 'Demo bookings', '20/mo',
   'The spine of the campaign. PRP bands map to weeks.',
   false, false, NULL, 0, 11, 4, true),

  ('print_newsletter',
   'Print Newsletter', 'Print Newsletter', 'Owned / Nurture', 'REDUCE',
   'Quarterly', 'Print + mail', 'Institutional replies', '12/quarter',
   'Institutional buyers read paper.',
   false, false, NULL, 0, 11, 5, true),

  -- Social (4)
  ('linkedin',
   'LinkedIn', 'LinkedIn', 'Social', 'PREDICT',
   '4 / wk', 'LinkedIn', 'Broker + facilities reach', 'Weekly reach 8K',
   'Best channel for brokers and risk/facilities titles.',
   false, false, NULL, 0, 11, 6, true),

  ('facebook',
   'Facebook', 'Facebook', 'Social', 'PREDICT',
   '3 / wk', 'Meta', 'Operator reach', 'Weekly reach 5K',
   'Independent operators live here.',
   false, false, NULL, 0, 11, 7, true),

  ('instagram',
   'Instagram', 'Instagram', 'Social', 'PREDICT',
   '3 / wk', 'Meta', 'Brand recall', 'Weekly reach 4K',
   E'Visual proof \u2014 before/after, sealed records.',
   false, false, NULL, 0, 11, 8, true),

  ('x_twitter',
   'X', 'X', 'Social', 'PREDICT',
   '3 / wk', 'X', 'Industry conversation', E'\u2014',
   'Lowest priority; industry listening.',
   false, false, NULL, 0, 11, 9, true),

  -- Paid (1)
  ('google_ads',
   'Google Ads', 'Google Ads', 'Paid', 'PREDICT',
   'Always-on', 'Google Ads', 'Cost / demo', '< $400',
   E'NOT a primary engine \u2014 brand defense, retargeting, bottom-funnel wedge terms only. $1.5\u20132.5K/mo test, 90-day kill/scale gate.',
   false, false, 'Support only', 1, 11, 10, true),

  -- Outbound (3)
  ('sdr_zoominfo',
   'SDR + ZoomInfo', 'SDR + ZoomInfo', 'Outbound', 'REDUCE',
   '500 calls / mo', 'Outsourced SDR', 'Cost / demo', '~$516 CAC',
   'Outsourced block. Survey is the cold wedge. Validate before Month 3.',
   false, false, NULL, 0, 11, 11, true),

  ('outbound_calls',
   'Outbound Calls', 'Outbound Calls', 'Outbound', 'REDUCE',
   'Daily dials', 'Dialer + ZoomInfo list', E'Conversations \u2192 demos', '15 demos / mo',
   'In-house calling, distinct from the outsourced SDR block. Same list, different caller.',
   false, false, NULL, 0, 11, 12, true),

  ('in_person',
   'In Person Prospecting', 'In Person Prospecting', 'Outbound', 'PROVE',
   'Weekly routes', 'Field visits', 'Walk-in demos', '8 demos / mo',
   E'CPP crossover \u2014 kitchens already served by Cleaning Pros Plus. Highest trust, zero media spend.',
   false, false, NULL, 0, 11, 13, true),

  -- Partner / Referral (2)
  ('insurance_broker',
   'Insurance Broker Channel', 'Insurance Broker Channel', 'Partner / Referral', 'PROVE',
   'Wk 16 start', 'Broker portal', 'Books championed', '6 brokers',
   E'Carrier-first GTM. Free distribution \u2014 brokers are influencers, not buyers.',
   false, true, NULL, 3, 11, 14, true),

  ('founder_referral',
   'Founder Cohort Referral', 'Founder Cohort Referral', 'Partner / Referral', 'PROVE',
   'Continuous', 'In-app', 'Referred seats', '25 seats',
   'Founder cohort refers peers. Zero CAC.',
   false, true, NULL, 2, 11, 15, true),

  -- PR / Earned (1)
  ('pr_window',
   'Concentrated PR Window', 'Concentrated PR Window', 'PR / Earned', 'PREDICT',
   'Single burst', 'Outreach', 'Placements', '6 placements',
   'One concentrated window rather than a drip.',
   false, true, NULL, 5, 5, 16, true)

ON CONFLICT (slug) DO UPDATE SET
  name                    = EXCLUDED.name,
  label                   = EXCLUDED.label,
  category                = EXCLUDED.category,
  prp_band                = EXCLUDED.prp_band,
  cadence                 = EXCLUDED.cadence,
  tool                    = EXCLUDED.tool,
  kpi                     = EXCLUDED.kpi,
  target                  = EXCLUDED.target,
  notes                   = EXCLUDED.notes,
  priority                = EXCLUDED.priority,
  is_new                  = EXCLUDED.is_new,
  flag                    = EXCLUDED.flag,
  activation_start_month  = EXCLUDED.activation_start_month,
  activation_end_month    = EXCLUDED.activation_end_month,
  sort_order              = EXCLUDED.sort_order,
  is_active               = true,
  updated_at              = now();
