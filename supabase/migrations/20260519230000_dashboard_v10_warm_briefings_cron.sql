-- =====================================================================
-- Migration: Dashboard v10 — C5b warm-advisor-briefings cron registration
-- Timestamp: 20260519230000
-- Commit: C5b of Dashboard v10 build sequence
--
-- Registers pg_cron job 'warm-advisor-briefings' to fire hourly UTC.
-- Edge function checks if current UTC time is 6 AM in each org's
-- timezone before warming briefing cache.
-- Uses vault.decrypted_secrets for service_role_key (same pattern as C2/C3).
-- =====================================================================

SELECT cron.schedule(
  'warm-advisor-briefings',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/generate-advisor-briefing',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'x-evidly-cron-source', 'warm-cache'
    ),
    body := '{"cron_mode":true}'::jsonb
  );
  $$
);

-- =====================================================================
-- Rule #14 — Apply-time verification block
-- =====================================================================

DO $$
DECLARE
  _job_count integer;
  _schedule text;
BEGIN
  SELECT count(*), min(schedule)
  INTO _job_count, _schedule
  FROM cron.job
  WHERE jobname = 'warm-advisor-briefings';

  IF _job_count = 0 THEN
    RAISE EXCEPTION 'warm-advisor-briefings cron job NOT registered in cron.job';
  END IF;

  IF _schedule != '0 * * * *' THEN
    RAISE EXCEPTION 'warm-advisor-briefings schedule mismatch: expected "0 * * * *", found "%"', _schedule;
  END IF;

  RAISE NOTICE 'PASS warm-advisor-briefings cron job registered with schedule: 0 * * * *';
END $$;
