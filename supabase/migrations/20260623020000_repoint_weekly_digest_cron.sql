-- Repoint the Monday 3pm UTC cron from weekly-digest (ghost) to ai-weekly-digest.
-- weekly-digest was a ghost function (deployed, no source).
-- ai-weekly-digest (has full source) now handles AI narrative + polished template + opt-out.

DO $$
BEGIN
  -- Unschedule the old weekly-digest cron if it exists
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-digest') THEN
    PERFORM cron.unschedule('weekly-digest');
    RAISE NOTICE 'Unscheduled cron job: weekly-digest';
  ELSE
    RAISE NOTICE 'Cron job weekly-digest not found — already removed';
  END IF;

  -- Unschedule ai-weekly-digest if it exists (idempotent re-create)
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-weekly-digest') THEN
    PERFORM cron.unschedule('ai-weekly-digest');
  END IF;

  -- Schedule ai-weekly-digest on Monday 3pm UTC (same schedule as the old ghost)
  PERFORM cron.schedule(
    'ai-weekly-digest',
    '0 15 * * 1',
    $job$
    SELECT net.http_post(
        url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/ai-weekly-digest',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := '{}'::jsonb
    );
    $job$
  );
  RAISE NOTICE 'Scheduled cron job: ai-weekly-digest (Monday 3pm UTC)';
END $$;
