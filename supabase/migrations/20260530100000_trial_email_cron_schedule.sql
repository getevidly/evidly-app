-- pg_cron schedules for trial email system
-- Requires pg_cron and pg_net extensions (enabled in Supabase dashboard)

-- Trial emails: daily at 7 AM PT (15:00 UTC)
SELECT cron.schedule(
  'trial-email-daily',
  '0 15 * * *',
  $$SELECT net.http_post(
    url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/trial-email-sender',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  )$$
);

-- Vendor notifications: daily at 8 AM PT (16:00 UTC)
SELECT cron.schedule(
  'vendor-notifications-daily',
  '0 16 * * *',
  $$SELECT net.http_post(
    url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/vendor-notification-sender',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  )$$
);

-- Vendor partner outreach: daily at 9 AM PT (17:00 UTC)
SELECT cron.schedule(
  'vendor-partner-outreach-daily',
  '0 17 * * *',
  $$SELECT net.http_post(
    url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/vendor-partner-outreach',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  )$$
);
