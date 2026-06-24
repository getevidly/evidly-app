-- Drop the legacy expiration-alerts cron job.
-- The expiration-alerts edge function was a ghost (deployed, no source).
-- document-expiry-status (6am daily, has source) now handles both
-- status transitions AND email alerts for compliance_documents.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expiration-alerts') THEN
    PERFORM cron.unschedule('expiration-alerts');
    RAISE NOTICE 'Unscheduled cron job: expiration-alerts';
  ELSE
    RAISE NOTICE 'Cron job expiration-alerts not found — already removed';
  END IF;
END $$;
