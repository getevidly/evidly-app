-- Register pg_cron job: partner-expiry-scan, daily at 11:00 UTC.
-- Calls the partner-expiry-scan edge function, which digests every
-- partner_documents row expiring within 30 days (or already past due)
-- into one email per vendor, plus a copy to Arthur.
--
-- 11:00 is clear of the existing daily jobs — document-expiry-status
-- (06:00), document-reminders (09:15) and vendor-document-reminders
-- (10:00) all run earlier.
--
-- Auth: Vault secret 'service_role_key' (the 20260809000000 pattern).
-- Registration shape copied from pl-retention-purge (20261208000000)
-- and intelligence-digest (20261216000000) — unschedule first so the
-- migration is safe to re-run.
DO $BODY$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'partner-expiry-scan') THEN
    PERFORM cron.unschedule('partner-expiry-scan');
  END IF;
  PERFORM cron.schedule(
    'partner-expiry-scan',
    '0 11 * * *',
    $job$
    SELECT net.http_post(
        url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/partner-expiry-scan',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := '{}'::jsonb
    );
    $job$
  );
END
$BODY$;
