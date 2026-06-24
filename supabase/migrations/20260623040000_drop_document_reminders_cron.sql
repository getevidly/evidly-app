-- Drop the dead 'document-reminders' cron job.
-- Fires a non-existent function (not in the deployed 218).
-- Fully superseded by document-expiry-status (6am daily, has source)
-- and vendor-document-reminders (10am daily, has source).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'document-reminders') THEN
    PERFORM cron.unschedule('document-reminders');
    RAISE NOTICE 'Unscheduled cron job: document-reminders';
  ELSE
    RAISE NOTICE 'Cron job document-reminders not found — already removed';
  END IF;
END $$;
