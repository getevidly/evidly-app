-- M16: Add deferred_until + deferred_reason to location_service_schedules
-- Gap: G2 from ANSWER-LINE-PATTERN.md §8
-- Pre-condition: 0 rows in table — no backfill needed

ALTER TABLE location_service_schedules
  ADD COLUMN IF NOT EXISTS deferred_until DATE,
  ADD COLUMN IF NOT EXISTS deferred_reason TEXT;

COMMENT ON COLUMN location_service_schedules.deferred_until IS
  'Date when deferral ends and the service schedule resumes. NULL = not deferred. When set, service status becomes deferred.';

COMMENT ON COLUMN location_service_schedules.deferred_reason IS
  'Free-text reason for deferring the service schedule. Required by UI when setting deferred_until.';
