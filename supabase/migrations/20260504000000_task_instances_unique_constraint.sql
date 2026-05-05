-- TASK-INSTANCES-UNIQUE-01
-- Adds unique constraint missing from the original task_assignment_system migration.
-- Constraint matches the edge function's documented idempotency contract on
-- generate-task-instances (skips on 23505 unique violation).
--
-- Applied directly to PROD via SQL editor on 2026-05-04.
-- This file is a record, not a re-run candidate.

ALTER TABLE task_instances
ADD CONSTRAINT task_instances_definition_date_shift_unique
UNIQUE (definition_id, date, shift);
