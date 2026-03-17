-- PREDICT-DAY1-01: Enable daily predictive analysis + new-location trigger
-- Activates pg_cron schedule for generate-alerts edge function
-- and fires predictions when a new location is created.

-- ────────────────────────────────────────────────────────
-- 1. Enable extensions (idempotent)
-- ────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ────────────────────────────────────────────────────────
-- 2. Daily cron job — 6 AM UTC
--    Calls generate-alerts for each active organization.
--    Uses Supabase app settings for URL and service_role_key.
-- ────────────────────────────────────────────────────────
SELECT cron.schedule(
  'generate-predictive-alerts',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-alerts',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('organization_id', org.id)
    )
    FROM organizations org
    WHERE org.is_active = true;
  $$
);

-- ────────────────────────────────────────────────────────
-- 3. Trigger: fire generate-alerts on new location creation
-- ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_predictions_for_new_location()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('organization_id', NEW.organization_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_location_predictions ON locations;
CREATE TRIGGER trg_new_location_predictions
  AFTER INSERT ON locations
  FOR EACH ROW EXECUTE FUNCTION trigger_predictions_for_new_location();
