-- =====================================================================
-- Migration: Dashboard v10 — detect-operational-drift cron registration
-- Timestamp: 20260519200000
-- Commit: C2 of Dashboard v10 build sequence
--
-- Registers pg_cron job 'detect-operational-drift' to fire every 15 min.
-- Invokes the edge function via net.http_post through Supabase gateway.
-- Uses vault.decrypted_secrets for service_role_key (matches existing
-- cron pattern from document-expiry-status, vendor-document-reminders).
-- =====================================================================

SELECT cron.schedule(
  'detect-operational-drift',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/detect-operational-drift',
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
  WHERE jobname = 'detect-operational-drift';

  IF _job_count = 0 THEN
    RAISE EXCEPTION 'detect-operational-drift cron job NOT registered in cron.job';
  END IF;

  IF _schedule != '*/15 * * * *' THEN
    RAISE EXCEPTION 'detect-operational-drift schedule mismatch: expected "*/15 * * * *", found "%"', _schedule;
  END IF;

  RAISE NOTICE 'PASS detect-operational-drift cron job registered with schedule: */15 * * * *';
END $$;
