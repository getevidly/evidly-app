-- ============================================================================
-- Register daily cron: document-expiry-status
-- Runs at 6am UTC daily (before expiration-alerts at 8am, document-reminders at 9:15am)
-- Transitions compliance_documents status based on expiry_date.
-- ============================================================================

SELECT cron.schedule(
  'document-expiry-status',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/document-expiry-status',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"source":"cron"}'::jsonb
  );
  $$
);
