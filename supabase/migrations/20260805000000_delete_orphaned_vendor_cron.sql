-- Delete two orphaned pg_cron jobs whose target edge functions don't exist.
-- Pre-existing damage from the placeholder migration era.
-- Replacement cron for service-record-request-sender comes in Sprint A commit A9.
--
-- Idempotent: safe to re-run if jobs are already removed.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'vendor-upload-reminders') THEN
    PERFORM cron.unschedule('vendor-upload-reminders');
    RAISE NOTICE 'Unscheduled cron job: vendor-upload-reminders';
  ELSE
    RAISE NOTICE 'Cron job vendor-upload-reminders not present, skipping';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'vendor-sms-reminders') THEN
    PERFORM cron.unschedule('vendor-sms-reminders');
    RAISE NOTICE 'Unscheduled cron job: vendor-sms-reminders';
  ELSE
    RAISE NOTICE 'Cron job vendor-sms-reminders not present, skipping';
  END IF;
END $$;
