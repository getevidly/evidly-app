-- ════════════════════════════════════════════════════════════
-- CALENDAR ↔ SCHEDULE SYNC TRIGGER
--
-- Automatically creates/updates/removes a calendar_events row
-- whenever location_service_schedules.next_due_date changes.
--
-- A. Adds schedule_id column + partial-unique index to calendar_events.
-- B. Trigger function: AFTER INSERT OR UPDATE on location_service_schedules.
--    - next_due_date set & is_active → upsert calendar_events row.
--    - next_due_date NULL or is_active=false → delete linked row.
-- C. Backfill existing schedules.
--
-- The 4 existing calendar writers (service-request flow) are unaffected:
-- they insert without schedule_id, and the unique index is partial
-- (WHERE schedule_id IS NOT NULL).
--
-- Tracker: supabase_migrations.schema_migrations version = '20260928000000'
-- ════════════════════════════════════════════════════════════


-- ── A. Link column + dedup index ─────────────────────────────

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS schedule_id uuid
    REFERENCES location_service_schedules(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_events_schedule_id
  ON calendar_events(schedule_id) WHERE schedule_id IS NOT NULL;

COMMENT ON COLUMN calendar_events.schedule_id IS
  'FK to location_service_schedules. Partial-unique: one calendar event per schedule. '
  'Set by the sync trigger, not by the 4 service-request writers.';


-- ── B. Trigger function ──────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_schedule_to_calendar_event()
RETURNS TRIGGER AS $$
DECLARE
  _display_name text;
  _vendor_name  text;
  _title        text;
BEGIN
  -- ── GUARD: only fire when next_due_date actually changed (or INSERT) ──
  IF TG_OP = 'UPDATE'
     AND NEW.next_due_date IS NOT DISTINCT FROM OLD.next_due_date
     AND NEW.is_active = OLD.is_active
     AND NEW.vendor_name IS NOT DISTINCT FROM OLD.vendor_name
     AND NEW.vendor_id IS NOT DISTINCT FROM OLD.vendor_id
  THEN
    RETURN NEW;  -- nothing calendar-relevant changed
  END IF;

  -- ── CASE 1: schedule unscheduled or deactivated → remove calendar row ──
  IF NEW.next_due_date IS NULL OR NEW.is_active = false THEN
    DELETE FROM calendar_events WHERE schedule_id = NEW.id;
    RETURN NEW;
  END IF;

  -- ── CASE 2: next_due_date set & active → upsert calendar event ──

  -- Resolve display name from service_type_definitions
  SELECT name INTO _display_name
    FROM service_type_definitions
   WHERE code = NEW.service_type_code;
  _display_name := COALESCE(_display_name, NEW.service_type_code);

  -- Resolve vendor name: prefer schedule's vendor_name, else look up by vendor_id
  _vendor_name := NEW.vendor_name;
  IF _vendor_name IS NULL AND NEW.vendor_id IS NOT NULL THEN
    SELECT company_name INTO _vendor_name
      FROM vendors
     WHERE id = NEW.vendor_id;
  END IF;

  _title := _display_name || ' — ' || COALESCE(_vendor_name, 'Unassigned');

  INSERT INTO calendar_events (
    organization_id,
    location_id,
    schedule_id,
    title,
    type,
    category,
    date,
    start_time,
    end_time,
    vendor_id,
    vendor_name,
    status
  ) VALUES (
    NEW.organization_id,
    NEW.location_id,
    NEW.id,
    _title,
    'vendor',
    _display_name,
    NEW.next_due_date,
    '08:00',
    '10:00',
    NEW.vendor_id,
    _vendor_name,
    'scheduled'
  )
  ON CONFLICT (schedule_id) WHERE schedule_id IS NOT NULL
  DO UPDATE SET
    date        = EXCLUDED.date,
    title       = EXCLUDED.title,
    category    = EXCLUDED.category,
    vendor_id   = EXCLUDED.vendor_id,
    vendor_name = EXCLUDED.vendor_name,
    updated_at  = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_sync_schedule_to_calendar
  ON location_service_schedules;

CREATE TRIGGER trg_sync_schedule_to_calendar
  AFTER INSERT OR UPDATE ON location_service_schedules
  FOR EACH ROW
  EXECUTE FUNCTION sync_schedule_to_calendar_event();


-- ── C. Backfill existing schedules ───────────────────────────
-- One-time insert for all active schedules with a next_due_date.
-- ON CONFLICT handles any rows the trigger already created.

INSERT INTO calendar_events (
  organization_id,
  location_id,
  schedule_id,
  title,
  type,
  category,
  date,
  start_time,
  end_time,
  vendor_id,
  vendor_name,
  status
)
SELECT
  lss.organization_id,
  lss.location_id,
  lss.id,
  COALESCE(std.name, lss.service_type_code)
    || ' — '
    || COALESCE(
         lss.vendor_name,
         v.company_name,
         'Unassigned'
       ),
  'vendor',
  COALESCE(std.name, lss.service_type_code),
  lss.next_due_date,
  '08:00',
  '10:00',
  lss.vendor_id,
  COALESCE(lss.vendor_name, v.company_name),
  'scheduled'
FROM location_service_schedules lss
LEFT JOIN service_type_definitions std
  ON std.code = lss.service_type_code
LEFT JOIN vendors v
  ON v.id = lss.vendor_id
WHERE lss.next_due_date IS NOT NULL
  AND lss.is_active = true
ON CONFLICT (schedule_id) WHERE schedule_id IS NOT NULL
DO UPDATE SET
  date        = EXCLUDED.date,
  title       = EXCLUDED.title,
  category    = EXCLUDED.category,
  vendor_id   = EXCLUDED.vendor_id,
  vendor_name = EXCLUDED.vendor_name,
  updated_at  = now();


-- ── D. Migration tracker ─────────────────────────────────────

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260928000000')
ON CONFLICT DO NOTHING;
