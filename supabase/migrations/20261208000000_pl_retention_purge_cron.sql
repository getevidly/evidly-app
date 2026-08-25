-- Register pg_cron job: pl-retention-purge, hourly on the hour.
-- Calls the pl-retention-purge edge function, which sweeps
-- policy_lens_intakes where purge_due_at <= now() and purged_at is NULL.
-- Auth: Vault secret 'service_role_key' (the 20260809000000 pattern).
DO $BODY$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pl-retention-purge') THEN
    PERFORM cron.unschedule('pl-retention-purge');
  END IF;
  PERFORM cron.schedule(
    'pl-retention-purge',
    '0 * * * *',
    $job$
    SELECT net.http_post(
        url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/pl-retention-purge',
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
