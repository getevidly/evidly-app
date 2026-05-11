-- M13: pg_cron schedule for vendor-service-record-trigger
-- DEFERRED: Do not apply until vendor-service-record-trigger edge function is deployed.
-- Fires daily at 02:00 UTC
-- Edge function scans for services >= 5 business days past expected date
--   with no associated compliance_document_requests row,
--   creates token + sends branded Resend email

-- Requires: pg_cron extension (already enabled), vault secret for JWT

-- Unschedule if exists (idempotent)
SELECT cron.unschedule('vendor-service-record-trigger')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'vendor-service-record-trigger'
);

-- Schedule the cron job
SELECT cron.schedule(
  'vendor-service-record-trigger',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/vendor-service-record-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('source', 'pg_cron', 'ts', now()::text)
  );
  $$
);
