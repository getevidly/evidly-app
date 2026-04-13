-- ============================================================================
-- GAP-07: Equipment Maintenance & Calibration Logs — Schema Enhancements
-- ============================================================================
-- The equipment and equipment_service_records tables already exist
-- (migration 20260222000000_fire_safety_equipment_tables.sql).
-- This migration adds calibration tracking and compliance risk tagging.
-- ============================================================================

-- Add calibration-specific columns to equipment table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'requires_calibration'
  ) THEN
    ALTER TABLE equipment ADD COLUMN requires_calibration boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'last_calibration_date'
  ) THEN
    ALTER TABLE equipment ADD COLUMN last_calibration_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'calibration_interval_days'
  ) THEN
    ALTER TABLE equipment ADD COLUMN calibration_interval_days integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'next_calibration_due'
  ) THEN
    ALTER TABLE equipment ADD COLUMN next_calibration_due date;
  END IF;
END $$;

-- Add 'calibration' to service type check if not already present
-- (equipment_service_records.service_type is text, no constraint to modify)

-- Add comment for compliance risk querying (GAP-11 forward-looking)
COMMENT ON TABLE equipment IS
  'GAP-07: Equipment registry with maintenance and calibration tracking. '
  'Overdue maintenance (next_maintenance_due < now()) = compliance risk flag for GAP-11. '
  'Overdue calibration (next_calibration_due < now()) = compliance risk flag for GAP-11. '
  'Status: current | due_soon (<=14d) | overdue. Calculate on read.';

-- Index for calibration due date queries
CREATE INDEX IF NOT EXISTS idx_equipment_calibration_due
  ON equipment(next_calibration_due)
  WHERE requires_calibration = true;

-- Index for compliance risk queries: all overdue equipment
CREATE INDEX IF NOT EXISTS idx_equipment_overdue
  ON equipment(organization_id, next_maintenance_due)
  WHERE is_active = true;
