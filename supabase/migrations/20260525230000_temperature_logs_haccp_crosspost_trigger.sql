-- =====================================================================
-- temperature_logs → haccp_monitoring_logs cross-post trigger
-- =====================================================================
-- A. Add source_temperature_log_id FK column
-- B. Create trigger function fn_log_haccp_from_temperature_log()
-- C. Attach trigger with WHEN guard to skip IoT rows
-- D. Backfill existing 7 manual rows
-- =====================================================================

BEGIN;

-- ─── A. Add source pointer column ───────────────────────────────────
ALTER TABLE haccp_monitoring_logs
  ADD COLUMN source_temperature_log_id uuid REFERENCES temperature_logs(id);

CREATE INDEX idx_haccp_monitoring_logs_source_temp_log
  ON haccp_monitoring_logs(source_temperature_log_id);

-- ─── B. Trigger function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_log_haccp_from_temperature_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_ccp_id uuid;
  v_org_id uuid;
  v_monitored_by_name text;
BEGIN
  -- Resolve ccp_id from equipment
  SELECT ccp_id INTO v_ccp_id FROM temperature_equipment WHERE id = NEW.equipment_id;
  IF v_ccp_id IS NULL THEN
    RAISE WARNING 'temperature_logs % has equipment % with no ccp_id — skipping HACCP cross-post', NEW.id, NEW.equipment_id;
    RETURN NEW;
  END IF;

  -- Resolve org_id from facility
  SELECT organization_id INTO v_org_id FROM locations WHERE id = NEW.facility_id;
  IF v_org_id IS NULL THEN
    RAISE WARNING 'temperature_logs % has facility % with no organization_id — skipping HACCP cross-post', NEW.id, NEW.facility_id;
    RETURN NEW;
  END IF;

  -- Resolve user display name
  IF NEW.logged_by IS NOT NULL THEN
    SELECT full_name INTO v_monitored_by_name FROM user_profiles WHERE id = NEW.logged_by;
  END IF;

  -- Insert with exception swallowing so temperature_logs insert never fails
  BEGIN
    INSERT INTO haccp_monitoring_logs (
      ccp_id, organization_id, facility_id, reading_value, reading_unit,
      is_within_limit, monitored_by, monitored_by_name, monitored_at, source_temperature_log_id
    ) VALUES (
      v_ccp_id, v_org_id, NEW.facility_id, NEW.temperature, '°F',
      NEW.temp_pass, NEW.logged_by, v_monitored_by_name, NEW.reading_time, NEW.id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'HACCP cross-post failed for temperature_logs %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

-- ─── C. Attach trigger (skip IoT rows — edge function handles those) ─
CREATE TRIGGER trg_log_haccp_from_temperature_log
AFTER INSERT ON temperature_logs
FOR EACH ROW
WHEN (NEW.input_method <> 'iot_sensor')
EXECUTE FUNCTION fn_log_haccp_from_temperature_log();

-- ─── D. Backfill existing manual rows ────────────────────────────────
INSERT INTO haccp_monitoring_logs (
  ccp_id, organization_id, facility_id, reading_value, reading_unit,
  is_within_limit, monitored_by, monitored_by_name, monitored_at, source_temperature_log_id
)
SELECT
  te.ccp_id,
  l.organization_id,
  tl.facility_id,
  tl.temperature,
  '°F',
  tl.temp_pass,
  tl.logged_by,
  up.full_name,
  tl.reading_time,
  tl.id
FROM temperature_logs tl
JOIN temperature_equipment te ON te.id = tl.equipment_id
JOIN locations l ON l.id = tl.facility_id
LEFT JOIN user_profiles up ON up.id = tl.logged_by
WHERE tl.input_method <> 'iot_sensor'
  AND NOT EXISTS (SELECT 1 FROM haccp_monitoring_logs hml WHERE hml.source_temperature_log_id = tl.id);

-- ─── Register migration ─────────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260525230000');

COMMIT;
