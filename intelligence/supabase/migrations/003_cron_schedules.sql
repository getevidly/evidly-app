-- ============================================================
-- INTEL-01 Migration 003 — Cron Schedules (5)
-- Requires pg_cron extension (enabled in 001_schema.sql)
-- ============================================================

-- ── 1. Main Intelligence Crawl — Daily 10:00 UTC ─────────────────────
-- Triggers the intelligence-crawl edge function to fetch all active
-- daily sources. Hourly sources are handled separately by their own cron.
SELECT cron.schedule(
  'intelligence-crawl-daily',
  '0 10 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/intelligence-crawl',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"frequency": "daily"}'::jsonb
  )$$
);

-- ── 2. Recall Monitor — Daily 13:00 UTC ──────────────────────────────
-- Checks FDA and USDA recall feeds for new entries.
SELECT cron.schedule(
  'recall-monitor-daily',
  '0 13 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/recall-monitor',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);

-- ── 3. Outbreak Monitor — Daily 13:30 UTC ────────────────────────────
-- Checks CDC FoodNet and CDPH outbreak feeds.
SELECT cron.schedule(
  'outbreak-monitor-daily',
  '30 13 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/outbreak-monitor',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);

-- ── 4. Legislative Tracker — Weekly Monday 15:00 UTC ─────────────────
-- Scrapes CA legislature for food safety bill status updates.
SELECT cron.schedule(
  'legislative-tracker-weekly',
  '0 15 * * 1',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/legislative-tracker',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);

-- ── 5. Intelligence Digest — Weekly Sunday 14:00 UTC ─────────────────
-- Compiles weekly digest for all active clients and delivers via webhook.
SELECT cron.schedule(
  'intelligence-digest-weekly',
  '0 14 * * 0',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/intelligence-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);
