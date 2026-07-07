-- ════════════════════════════════════════════════════════════
-- CALENDAR <-> SCHEDULE SYNC TRIGGER  (corrected)
-- Auto-creates/updates/removes a calendar_events row when
-- location_service_schedules.next_due_date changes.
-- Verified against live schema: vendor col = company_name;
-- calendar_events has NO vendor_name/vendor_id cols (omitted);
-- created_at/updated_at are NOT NULL (set explicitly).
-- Tracker version: 20260928000000
-- ════════════════════════════════════════════════════════════

-- A. Link column + partial-unique dedup index
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS schedule_id uuid
    REFERENCES location_service_schedules(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_events_schedule_id
  ON calendar_events(schedule_id) WHERE schedule_id IS NOT NULL;

-- B. Trigger function
CREATE OR REPLACE FUNCTION sync_schedule_to_calendar_event()
RETURNS TRIGGER AS $$
DECLARE
  _display_name text;
  _vendor_name  text;
  _title        text;
BEGIN
  -- Only act when something calendar-relevant changed (or on INSERT)
  IF TG_OP = 'UPDATE'
     AND NEW.next_due_date IS NOT DISTINCT FROM OLD.next_due_date
     AND NEW.is_active     IS NOT DISTINCT FROM OLD.is_active
     AND NEW.vendor_name   IS NOT DISTINCT FROM OLD.vendor_name
     AND NEW.vendor_id     IS NOT DISTINCT FROM OLD.vendor_id
     AND NEW.service_type_code IS NOT DISTINCT FROM OLD.service_type_code
  THEN
    RETURN NEW;
  END IF;

  -- Unscheduled or deactivated -> remove the calendar row
  IF NEW.next_due_date IS NULL OR NEW.is_active = false THEN
    DELETE FROM calendar_events WHERE schedule_id = NEW.id;
    RETURN NEW;
  END IF;

  -- Resolve display name
  SELECT name INTO _display_name
    FROM service_type_definitions
   WHERE code = NEW.service_type_code;
  _display_name := COALESCE(_display_name, NEW.service_type_code);

  -- Resolve vendor name (schedule's vendor_name, else vendors.company_name)
  _vendor_name := NEW.vendor_name;
  IF _vendor_name IS NULL AND NEW.vendor_id IS NOT NULL THEN
    SELECT company_name INTO _vendor_name FROM vendors WHERE id = NEW.vendor_id;
  END IF;

  _title := _display_name || ' — ' || COALESCE(_vendor_name, 'Unassigned');

  INSERT INTO calendar_events (
    organization_id, location_id, schedule_id,
    title, type, category, date,
    start_time, end_time, status,
    created_at, updated_at
  ) VALUES (
    NEW.organization_id, NEW.location_id, NEW.id,
    _title, 'vendor', _display_name, NEW.next_due_date,
    '08:00', '10:00', 'scheduled',
    now(), now()
  )
  ON CONFLICT (schedule_id) WHERE schedule_id IS NOT NULL
  DO UPDATE SET
    date       = EXCLUDED.date,
    title      = EXCLUDED.title,
    category   = EXCLUDED.category,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger
DROP TRIGGER IF EXISTS trg_sync_schedule_to_calendar ON location_service_schedules;
CREATE TRIGGER trg_sync_schedule_to_calendar
  AFTER INSERT OR UPDATE ON location_service_schedules
  FOR EACH ROW EXECUTE FUNCTION sync_schedule_to_calendar_event();

-- C. Backfill existing active, dated schedules
INSERT INTO calendar_events (
  organization_id, location_id, schedule_id,
  title, type, category, date,
  start_time, end_time, status,
  created_at, updated_at
)
SELECT
  lss.organization_id, lss.location_id, lss.id,
  COALESCE(std.name, lss.service_type_code) || ' — '
    || COALESCE(lss.vendor_name, v.company_name, 'Unassigned'),
  'vendor',
  COALESCE(std.name, lss.service_type_code),
  lss.next_due_date,
  '08:00', '10:00', 'scheduled',
  now(), now()
FROM location_service_schedules lss
LEFT JOIN service_type_definitions std ON std.code = lss.service_type_code
LEFT JOIN vendors v ON v.id = lss.vendor_id
WHERE lss.next_due_date IS NOT NULL
  AND lss.is_active = true
ON CONFLICT (schedule_id) WHERE schedule_id IS NOT NULL
DO UPDATE SET
  date       = EXCLUDED.date,
  title      = EXCLUDED.title,
  category   = EXCLUDED.category,
  updated_at = now();

-- D. Migration tracker
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260928000000')
ON CONFLICT DO NOTHING;
