-- M17: Add completed_count to location_service_schedules
-- Gap: G3 from ANSWER-LINE-PATTERN.md §8, part 1 (column)
-- Pre-condition: 0 rows in both tables — no backfill needed

ALTER TABLE location_service_schedules
  ADD COLUMN IF NOT EXISTS completed_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN location_service_schedules.completed_count IS
  'Denormalized count of vendor_service_records for this schedule. Maintained by trigger on vendor_service_records INSERT/DELETE. Used by answer-line: 0 = First service, >0 = Last: date.';

-- Index for queries that filter on completed_count = 0 (first-service variant)
CREATE INDEX IF NOT EXISTS idx_lss_completed_count_zero
  ON location_service_schedules (organization_id)
  WHERE completed_count = 0;
