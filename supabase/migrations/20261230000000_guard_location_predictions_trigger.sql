-- ============================================================
-- Guard trg_new_location_predictions against absent app.settings
--
-- trigger_predictions_for_new_location() read its config with the
-- single-argument current_setting(), which THROWS 42704 when the
-- parameter is unset. app.settings.supabase_url has never been set
-- on this project and cannot be (ALTER DATABASE is permission-denied),
-- so this AFTER INSERT trigger aborted EVERY insert into locations —
-- including the HoodOps seal, which created the org and then died at
-- step 4.
--
-- Fix: read both settings with the two-argument (missing_ok) form and
-- return early when either is absent. Settings present -> the
-- predictive-alerts call fires exactly as designed. Settings absent
-- (current state) -> the trigger no-ops and the insert succeeds.
-- Whenever the GUCs are configured properly, the trigger resumes on
-- its own: the guard only checks presence.
--
-- Only the function body changes. The trigger definition, the
-- locations table, and everything else are untouched.
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_predictions_for_new_location()
RETURNS TRIGGER AS $$
DECLARE
  v_url text := current_setting('app.settings.supabase_url', true);
  v_key text := current_setting('app.settings.service_role_key', true);
BEGIN
  -- Not configured -> skip the side effect, never block the insert.
  IF v_url IS NULL OR v_url = '' OR v_key IS NULL OR v_key = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/generate-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('organization_id', NEW.organization_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
