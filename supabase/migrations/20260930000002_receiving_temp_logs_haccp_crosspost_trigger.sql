-- =====================================================================
-- receiving_temp_logs → haccp_monitoring_logs cross-post trigger
-- =====================================================================
-- A. Add source_receiving_temp_log_id FK column on haccp_monitoring_logs
-- B. Create trigger function fn_log_haccp_from_receiving_temp_log()
-- C. Attach trigger AFTER INSERT (skip imported rows)
-- D. Backfill existing rows (mirrors temperature_logs trigger pattern)
-- =====================================================================
-- Mirrors 20260525230000 (temperature_logs → HACCP) and
-- 20260525240000 (cooldown_events → HACCP).
-- CCP resolution follows the cooldown pattern (by ccp_number) since
-- receiving has no equipment FK — resolves CCP-01 via plan org match.
-- =====================================================================

BEGIN;

-- ─── A. Add source pointer column ───────────────────────────────────
ALTER TABLE haccp_monitoring_logs
  ADD COLUMN IF NOT EXISTS source_receiving_temp_log_id uuid REFERENCES receiving_temp_logs(id);

CREATE INDEX IF NOT EXISTS idx_haccp_monitoring_logs_source_receiving
  ON haccp_monitoring_logs(source_receiving_temp_log_id);

-- ─── B. Trigger function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_log_haccp_from_receiving_temp_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_ccp_id uuid;
  v_monitored_by_name text;
BEGIN
  -- Resolve CCP-01 Receiving for this org
  SELECT ccp.id INTO v_ccp_id
  FROM haccp_critical_control_points ccp
  JOIN haccp_plans p ON ccp.plan_id = p.id
  WHERE p.organization_id = NEW.organization_id
    AND p.status = 'active'
    AND ccp.ccp_number = 'CCP-01'
  LIMIT 1;

  IF v_ccp_id IS NULL THEN
    RAISE WARNING 'receiving_temp_logs % has no CCP-01 for org % — skipping HACCP cross-post', NEW.id, NEW.organization_id;
    RETURN NEW;
  END IF;

  -- Resolve user display name
  IF NEW.received_by IS NOT NULL THEN
    SELECT full_name INTO v_monitored_by_name FROM user_profiles WHERE id = NEW.received_by;
  END IF;

  -- Insert with exception swallowing so receiving_temp_logs insert never fails
  BEGIN
    INSERT INTO haccp_monitoring_logs (
      ccp_id, organization_id, facility_id, reading_value, reading_unit,
      is_within_limit, monitored_by, monitored_by_name, monitored_at,
      source_receiving_temp_log_id
    ) VALUES (
      v_ccp_id, NEW.organization_id, NEW.location_id, NEW.temperature_value, '°F',
      NEW.is_pass, NEW.received_by, v_monitored_by_name,
      COALESCE(NEW.delivery_time, NEW.created_at), NEW.id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'HACCP cross-post failed for receiving_temp_logs %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

-- ─── C. Attach trigger (skip imported/migrated rows) ─────────────────
CREATE TRIGGER trg_log_haccp_from_receiving_temp_log
AFTER INSERT ON receiving_temp_logs
FOR EACH ROW
WHEN (NEW.input_method IS DISTINCT FROM 'imported')
EXECUTE FUNCTION fn_log_haccp_from_receiving_temp_log();

-- ─── D. Backfill existing rows ───────────────────────────────────────
-- Matches the temperature_logs trigger backfill pattern (20260525230000 §D).
-- DISTINCT ON (rtl.id) guards against duplicate CCPs if an org has
-- multiple active plans (each with its own CCP-01 UUID).
INSERT INTO haccp_monitoring_logs (
  ccp_id, organization_id, facility_id, reading_value, reading_unit,
  is_within_limit, monitored_by, monitored_by_name, monitored_at,
  source_receiving_temp_log_id
)
SELECT DISTINCT ON (rtl.id)
  ccp.id,
  rtl.organization_id,
  rtl.location_id,
  rtl.temperature_value,
  '°F',
  rtl.is_pass,
  rtl.received_by,
  up.full_name,
  COALESCE(rtl.delivery_time, rtl.created_at),
  rtl.id
FROM receiving_temp_logs rtl
JOIN haccp_plans p
  ON p.organization_id = rtl.organization_id
  AND p.status = 'active'
JOIN haccp_critical_control_points ccp
  ON ccp.plan_id = p.id
  AND ccp.ccp_number = 'CCP-01'
LEFT JOIN user_profiles up ON up.id = rtl.received_by
WHERE (rtl.input_method IS DISTINCT FROM 'imported')
  AND NOT EXISTS (
    SELECT 1 FROM haccp_monitoring_logs hml
    WHERE hml.source_receiving_temp_log_id = rtl.id
  )
ORDER BY rtl.id;

-- ─── Register migration ─────────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260930000002');

COMMIT;
