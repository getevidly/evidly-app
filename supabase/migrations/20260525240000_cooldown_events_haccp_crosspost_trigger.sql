-- =====================================================================
-- cooldown_events → haccp_monitoring_logs cross-post trigger
-- =====================================================================
-- A. Add source_cooldown_event_id FK column
-- B. Create trigger function fn_log_haccp_from_cooldown_event()
-- C. Attach trigger on terminal state transition (completed/disposition)
-- D. No backfill needed (0 rows)
-- =====================================================================

BEGIN;

-- ─── A. Add source pointer column ───────────────────────────────────
ALTER TABLE haccp_monitoring_logs
  ADD COLUMN source_cooldown_event_id uuid REFERENCES cooldown_events(id);

CREATE INDEX idx_haccp_monitoring_logs_source_cooldown
  ON haccp_monitoring_logs(source_cooldown_event_id);

-- ─── B. Trigger function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_log_haccp_from_cooldown_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_ccp_id uuid;
  v_is_within_limit boolean;
  v_reading_value numeric;
  v_monitored_at timestamptz;
  v_monitored_by_name text;
  v_existing_log_id uuid;
BEGIN
  -- Idempotency: skip if a HACCP row already exists for this cooldown event
  SELECT id INTO v_existing_log_id FROM haccp_monitoring_logs WHERE source_cooldown_event_id = NEW.id LIMIT 1;
  IF v_existing_log_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve CCP-05 Cooling for this org
  SELECT ccp.id INTO v_ccp_id
  FROM haccp_critical_control_points ccp
  JOIN haccp_plans p ON ccp.plan_id = p.id
  WHERE p.organization_id = NEW.organization_id
    AND p.status = 'active'
    AND ccp.ccp_number = 'CCP-05'
  LIMIT 1;

  IF v_ccp_id IS NULL THEN
    RAISE WARNING 'cooldown_events % has no CCP-05 for org % — skipping HACCP cross-post', NEW.id, NEW.organization_id;
    RETURN NEW;
  END IF;

  -- Derive pass/fail
  IF NEW.status = 'completed' AND NEW.failed_stage IS NULL THEN
    v_is_within_limit := true;
    v_monitored_at := COALESCE(NEW.stage_2_completed_at, NEW.updated_at);
  ELSE
    v_is_within_limit := false;
    v_monitored_at := NEW.updated_at;
  END IF;

  -- Get the final checkpoint temperature (latest cooldown_check)
  SELECT temperature INTO v_reading_value
  FROM cooldown_checks
  WHERE cooldown_event_id = NEW.id
  ORDER BY checked_at DESC
  LIMIT 1;

  -- Resolve user display name
  IF NEW.created_by IS NOT NULL THEN
    SELECT full_name INTO v_monitored_by_name FROM user_profiles WHERE id = NEW.created_by;
  END IF;

  -- Insert with exception swallowing
  BEGIN
    INSERT INTO haccp_monitoring_logs (
      ccp_id, organization_id, facility_id, reading_value, reading_unit,
      is_within_limit, monitored_by, monitored_by_name, monitored_at, source_cooldown_event_id
    ) VALUES (
      v_ccp_id, NEW.organization_id, NEW.location_id, v_reading_value, '°F',
      v_is_within_limit, NEW.created_by, v_monitored_by_name, v_monitored_at, NEW.id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'HACCP cross-post failed for cooldown_events %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

-- ─── C. Attach trigger (fires on terminal state transition) ─────────
CREATE TRIGGER trg_log_haccp_from_cooldown_event
AFTER UPDATE ON cooldown_events
FOR EACH ROW
WHEN (
  OLD.status IS DISTINCT FROM NEW.status
  AND (NEW.status = 'completed' OR NEW.disposition IS NOT NULL)
)
EXECUTE FUNCTION fn_log_haccp_from_cooldown_event();

-- ─── Register migration ─────────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260525240000');

COMMIT;
