-- =====================================================================
-- Migration: Register escalate-drift-notifications cron job
-- Timestamp: 20260711000001
--
-- Fires every 5 minutes. Checks for unacknowledged drift notifications
-- past their escalation_deadline and escalates to next role tier.
-- =====================================================================

SELECT cron.schedule(
  'escalate-drift-notifications',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/escalate-drift-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"source":"cron"}'::jsonb
  );
  $$
);

-- Verification block
DO $$
DECLARE
  _job_count integer;
  _schedule text;
BEGIN
  SELECT count(*), min(schedule)
  INTO _job_count, _schedule
  FROM cron.job
  WHERE jobname = 'escalate-drift-notifications';

  IF _job_count = 0 THEN
    RAISE EXCEPTION 'escalate-drift-notifications cron job NOT registered';
  END IF;

  IF _schedule != '*/5 * * * *' THEN
    RAISE EXCEPTION 'escalate-drift-notifications schedule mismatch: expected "*/5 * * * *", found "%"', _schedule;
  END IF;

  RAISE NOTICE 'PASS escalate-drift-notifications cron job registered with schedule: */5 * * * *';
END $$;
