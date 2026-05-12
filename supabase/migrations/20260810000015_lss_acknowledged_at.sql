-- M15: Add acknowledged_at to location_service_schedules
-- Gap: G1 from ANSWER-LINE-PATTERN.md §8
-- Pre-condition: 0 rows in table — no backfill needed

ALTER TABLE location_service_schedules
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

COMMENT ON COLUMN location_service_schedules.acknowledged_at IS
  'Timestamp when an org user acknowledged an at-risk service schedule. NULL = not acknowledged. Reset to NULL when next_due_date changes.';
