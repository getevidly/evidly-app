-- =====================================================================
-- Migration: Dashboard v10 — generate-weekly-drift-report cron registration
-- Timestamp: 20260519210000
-- Commit: C3 of Dashboard v10 build sequence
--
-- Registers pg_cron job 'generate-weekly-drift-report' to fire every hour.
-- The edge function checks if current UTC time is Monday 7 AM in each
-- org's timezone before generating reports.
-- Uses vault.decrypted_secrets for service_role_key (same pattern as C2).
-- =====================================================================

SELECT cron.schedule(
  'generate-weekly-drift-report',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/generate-weekly-drift-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"source":"cron"}'::jsonb
  );
  $$
);


-- =====================================================================
-- Rule #14 — Apply-time verification block
-- Confirms cron job is registered with correct schedule.
-- =====================================================================

DO $$
DECLARE
  _job_count integer;
  _schedule text;
BEGIN
  SELECT count(*), min(schedule)
  INTO _job_count, _schedule
  FROM cron.job
  WHERE jobname = 'generate-weekly-drift-report';

  IF _job_count = 0 THEN
    RAISE EXCEPTION 'generate-weekly-drift-report cron job NOT registered in cron.job';
  END IF;

  IF _schedule != '0 * * * *' THEN
    RAISE EXCEPTION 'generate-weekly-drift-report schedule mismatch: expected "0 * * * *", found "%"', _schedule;
  END IF;

  RAISE NOTICE 'PASS generate-weekly-drift-report cron job registered with schedule: 0 * * * *';
END $$;
