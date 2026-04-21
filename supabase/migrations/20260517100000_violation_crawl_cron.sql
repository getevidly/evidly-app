-- VIOLATION-OUTREACH-01: Schedule daily violation crawl at 7am Pacific (3pm UTC)
-- Requires pg_cron extension (enabled by default on Supabase)

DO $outer$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'daily-violation-crawl',
      '0 15 * * *',
      $$SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/violation-crawl',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', current_setting('app.settings.cron_secret')
        ),
        body := '{}'::jsonb
      );$$
    );
  END IF;
END $outer$;
