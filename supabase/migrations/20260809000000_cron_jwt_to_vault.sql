-- Migrate cron service_role JWTs to Supabase Vault secret pattern.
-- Source: vendor service records routing audit (Part A.3) + Sprint A diagnostics.
--
-- Approach: for each affected job, cron.unschedule() + cron.schedule() with same
-- name and schedule, command rewritten to source the JWT from Vault at fire time:
--   'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
--
-- Each job's structural shape is preserved exactly (jsonb literal vs
-- jsonb_build_object pattern, presence/absence of Content-Type and body).
-- Only the auth header source is changed.
--
-- Affected jobs (4 total):
--
-- Plaintext-JWT migrations (Jobs 1 & 4 — jsonb literal headers, with Content-Type + body):
-- - expiration-alerts: 'Bearer eyJ...' literal -> Vault read via jsonb_build_object
-- - weekly-digest: same
--
-- GUC-name fixes (Jobs 2 & 3 — jsonb_build_object headers, no Content-Type, no body):
-- - vendor-notifications-daily: current_setting('app.service_role_key') -> Vault read
--   (was failing daily since May 1 due to unset GUC)
-- - vendor-partner-outreach-daily: same
--
-- Prerequisite: Vault secret 'service_role_key' set on the linked project.
-- Verified in Step 0 of the prompt (length 219, computed Bearer header 226).
--
-- Idempotent: each job unscheduled (if present) before re-creating.

DO $BODY$
BEGIN
  -- Job 1: expiration-alerts (was: jsonb literal Bearer eyJ...)
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expiration-alerts') THEN
    PERFORM cron.unschedule('expiration-alerts');
  END IF;
  PERFORM cron.schedule(
    'expiration-alerts',
    '0 8 * * *',
    $job$
    SELECT net.http_post(
        url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/expiration-alerts',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := '{}'::jsonb
    );
    $job$
  );

  -- Job 4: weekly-digest (was: jsonb literal Bearer eyJ...)
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-digest') THEN
    PERFORM cron.unschedule('weekly-digest');
  END IF;
  PERFORM cron.schedule(
    'weekly-digest',
    '0 15 * * 1',
    $job$
    SELECT net.http_post(
        url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/weekly-digest',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := '{}'::jsonb
    );
    $job$
  );

  -- Job 2: vendor-notifications-daily (was: current_setting('app.service_role_key'))
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'vendor-notifications-daily') THEN
    PERFORM cron.unschedule('vendor-notifications-daily');
  END IF;
  PERFORM cron.schedule(
    'vendor-notifications-daily',
    '0 16 * * *',
    $job$
    SELECT net.http_post(
        url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/vendor-notification-sender',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        )
    )
    $job$
  );

  -- Job 3: vendor-partner-outreach-daily (was: current_setting('app.service_role_key'))
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'vendor-partner-outreach-daily') THEN
    PERFORM cron.unschedule('vendor-partner-outreach-daily');
  END IF;
  PERFORM cron.schedule(
    'vendor-partner-outreach-daily',
    '0 17 * * *',
    $job$
    SELECT net.http_post(
        url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/vendor-partner-outreach',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        )
    )
    $job$
  );
END $BODY$;
