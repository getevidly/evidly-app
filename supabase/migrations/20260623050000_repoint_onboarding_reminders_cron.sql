-- Repoint 'onboarding-reminders' cron (9am daily) to check-onboarding-progress.
-- Old cron fired a non-existent function with pre-Vault auth.
-- check-onboarding-progress is deployed, has source, has daily cadence logic
-- (3/7/14/21/28d) + 5-day cooldown. Restoring its trigger.
-- Auth upgraded from current_setting() to Vault pattern.

DO $$
BEGIN
  -- Drop the old dead cron
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'onboarding-reminders') THEN
    PERFORM cron.unschedule('onboarding-reminders');
    RAISE NOTICE 'Unscheduled cron job: onboarding-reminders';
  ELSE
    RAISE NOTICE 'Cron job onboarding-reminders not found — already removed';
  END IF;

  -- Drop if already exists (idempotent re-create)
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-onboarding-progress') THEN
    PERFORM cron.unschedule('check-onboarding-progress');
  END IF;

  -- Schedule check-onboarding-progress at 9am daily with Vault auth
  PERFORM cron.schedule(
    'check-onboarding-progress',
    '0 9 * * *',
    $job$
    SELECT net.http_post(
        url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/check-onboarding-progress',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := '{}'::jsonb
    );
    $job$
  );
  RAISE NOTICE 'Scheduled cron job: check-onboarding-progress (9am daily, Vault auth)';
END $$;
