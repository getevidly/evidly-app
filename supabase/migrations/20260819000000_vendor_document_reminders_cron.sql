-- ============================================================================
-- Register daily cron: vendor-document-reminders
-- Runs at 10am UTC daily (after document-expiry-status at 6am, document-reminders at 9:15am)
-- 7-stage expiry reminder engine for vendor documents.
-- ============================================================================

SELECT cron.schedule(
  'vendor-document-reminders',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/vendor-document-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"source":"cron"}'::jsonb
  );
  $$
);
