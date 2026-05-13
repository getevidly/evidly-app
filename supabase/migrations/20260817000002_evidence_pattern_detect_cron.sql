-- Daily cron: evidence pattern detection (Predict surface)
-- Runs at 7am UTC (3am ET) — scans messages for recurring signal phrases

DO $outer$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'evidence-pattern-detect',
      '0 7 * * *',
      $$SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/evidence-pattern-detect',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := jsonb_build_object('source', 'pg_cron', 'ts', now()::text)
      )$$
    );
  END IF;
END $outer$;
